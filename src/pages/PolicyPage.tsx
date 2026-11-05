import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { renderAsync } from 'docx-preview';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  FileText,
  Upload,
  Trash2,
  Eye,
  Save,
  X,
  FolderOpen,
  CheckCircle2,
  Pencil
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PolicyRecord {
  id: string;
  policyId: string;
  policyName: string;
  fileName: string;
  fileType: string;
  fileData?: string;
  pdfData?: string;
  docxHtml?: string;
  createdAt: string;
}

const LOCAL_POLICIES_KEY = 'modela_policies_v1';
const LOCAL_DELETED_POLICIES_KEY = 'modela_deleted_policies_v1';

const getDeletedPolicyIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_POLICIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map(id => String(id || '').trim().toLowerCase()).filter(Boolean));
      }
    }
  } catch {}
  return new Set();
};

const markPolicyDeletedLocally = (...ids: (string | undefined)[]) => {
  try {
    const set = getDeletedPolicyIds();
    ids.forEach(id => {
      const clean = String(id || '').trim().toLowerCase();
      if (clean) set.add(clean);
    });
    localStorage.setItem(LOCAL_DELETED_POLICIES_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

const unmarkPolicyDeletedLocally = (...ids: (string | undefined)[]) => {
  try {
    const set = getDeletedPolicyIds();
    ids.forEach(id => {
      const clean = String(id || '').trim().toLowerCase();
      if (clean) set.delete(clean);
    });
    localStorage.setItem(LOCAL_DELETED_POLICIES_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

const sanitizeDocId = (rawId: string): string => {
  return String(rawId || '')
    .trim()
    .replace(/[\/\\.#$\[\]]/g, '_')
    .slice(0, 100);
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(',');
  const base64 = parts.length > 1 ? parts[1] : parts[0];
  const binaryStr = window.atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

export const PolicyPage: React.FC = () => {
  const { currentUser, isSuperAdmin, isEmployee, isHR, isDirector } = useAuth();
  const { showToast } = useApp();
  const location = useLocation();

  const isSuperAdminRole = Boolean(isSuperAdmin || currentUser?.role === 'SUPER_ADMIN');
  const isEmployeeRole = Boolean(
    isEmployee ||
      currentUser?.role === 'EMPLOYEE' ||
      String(currentUser?.role || '').toUpperCase() === 'EMPLOYER'
  );
  const isHRRole = Boolean(
    isHR ||
      currentUser?.role === 'HR' ||
      currentUser?.role === 'HR_MANAGER' ||
      String(currentUser?.role || '').toUpperCase().includes('HR')
  );
  const isDirectorRole = Boolean(
    isDirector ||
      currentUser?.role === 'DIRECTOR' ||
      currentUser?.role === 'EXECUTIVE_DIRECTOR' ||
      String(currentUser?.role || '').toUpperCase().includes('DIRECTOR')
  );
  const activeSubPage: 'ADD_POLICY' | 'VIEW_POLICY' =
    !(isSuperAdminRole || isHRRole) || location.pathname.startsWith('/policy/view')
      ? 'VIEW_POLICY'
      : 'ADD_POLICY';
  const [policyName, setPolicyName] = useState('');
  const [policyId, setPolicyId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [editingPolicy, setEditingPolicy] = useState<PolicyRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastActivePolicyId, setLastActivePolicyId] = useState<string>('');

  const [policies, setPolicies] = useState<PolicyRecord[]>(() => {
    try {
      localStorage.removeItem(LOCAL_POLICIES_KEY);
    } catch {}
    return [];
  });

  const [viewingPolicy, setViewingPolicy] = useState<PolicyRecord | null>(null);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formContainerRef = useRef<HTMLDivElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const fileContentCacheRef = useRef<Map<string, { fileName: string; fileData?: string; pdfData?: string; docxHtml?: string }>>(new Map());

  const applyDatabasePolicies = useCallback((dbDocs: PolicyRecord[]) => {
    const deletedSet = getDeletedPolicyIds();
    const map = new Map<string, PolicyRecord>();

    dbDocs.forEach(item => {
      if (!item || !item.policyId || !item.policyName) return;
      const key = item.policyId.trim().toLowerCase();
      const docKey = String(item.id || '').trim().toLowerCase();
      if (deletedSet.has(key) || (docKey && deletedSet.has(docKey))) {
        return;
      }
      const cachedBinary = fileContentCacheRef.current.get(key);
      const isSameFile = !cachedBinary || !cachedBinary.fileName || cachedBinary.fileName === item.fileName;
      const mergedItem: PolicyRecord = {
        ...item,
        fileData: item.fileData || (isSameFile ? cachedBinary?.fileData : undefined),
        pdfData: item.pdfData || (isSameFile ? cachedBinary?.pdfData : ''),
        docxHtml: item.docxHtml || (isSameFile ? cachedBinary?.docxHtml : '')
      };
      if (mergedItem.fileData || mergedItem.docxHtml || mergedItem.pdfData) {
        fileContentCacheRef.current.set(key, {
          fileName: mergedItem.fileName,
          fileData: mergedItem.fileData,
          pdfData: mergedItem.pdfData,
          docxHtml: mergedItem.docxHtml
        });
      }
      map.set(key, mergedItem);
    });

    const next = Array.from(map.values()).sort((a, b) =>
      String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    );

    setPolicies(prev => {
      if (
        prev.length === next.length &&
        prev.every(
          (p, i) =>
            p.policyId === next[i].policyId &&
            p.policyName === next[i].policyName &&
            p.fileName === next[i].fileName &&
            p.createdAt === next[i].createdAt &&
            (p.fileData?.length || 0) === (next[i].fileData?.length || 0) &&
            (p.docxHtml?.length || 0) === (next[i].docxHtml?.length || 0)
        )
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    try {
      localStorage.removeItem(LOCAL_POLICIES_KEY);
    } catch {}

    // Load binary file cache from backend only to enrich policies that exist in Firestore
    fetch('/api/policies')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!isMounted || !data || !Array.isArray(data.policies)) return;
        data.policies.forEach((p: PolicyRecord) => {
          if (p && p.policyId && (p.fileData || p.docxHtml || p.pdfData)) {
            fileContentCacheRef.current.set(p.policyId.trim().toLowerCase(), {
              fileName: p.fileName,
              fileData: p.fileData,
              pdfData: p.pdfData,
              docxHtml: p.docxHtml
            });
          }
        });
        setPolicies(prev => {
          if (prev.length === 0) return prev;
          return prev.map(item => {
            const cached = fileContentCacheRef.current.get(item.policyId.trim().toLowerCase());
            if (!cached || (cached.fileName && cached.fileName !== item.fileName)) return item;
            return {
              ...item,
              fileData: item.fileData || cached.fileData,
              pdfData: item.pdfData || cached.pdfData || '',
              docxHtml: item.docxHtml || cached.docxHtml || ''
            };
          });
        });
      })
      .catch(() => {});

    const unsub = onSnapshot(
      collection(db, 'policies'),
      snapshot => {
        if (!isMounted) return;
        const fsPolicies: PolicyRecord[] = [];
        snapshot.docs.forEach(d => {
          const data = d.data() as PolicyRecord;
          if (data && data.policyId && data.policyName) {
            unmarkPolicyDeletedLocally(data.policyId, data.id || d.id);
            fsPolicies.push({
              ...data,
              id: data.id || d.id
            });
          }
        });
        applyDatabasePolicies(fsPolicies);
      },
      () => {
        // Ignore snapshot permission/network fallback errors
      }
    );
    return () => {
      isMounted = false;
      unsub();
    };
  }, [applyDatabasePolicies]);

  // Keep viewingPolicy synchronized with enriched policy data (e.g. fileData/docxHtml) when policies update
  useEffect(() => {
    if (!viewingPolicy) return;
    const updated = policies.find(
      p => p.policyId.toLowerCase() === viewingPolicy.policyId.toLowerCase()
    );
    if (
      updated &&
      ((!viewingPolicy.fileData && updated.fileData) ||
        (!viewingPolicy.docxHtml && updated.docxHtml) ||
        updated.fileName !== viewingPolicy.fileName ||
        updated.policyName !== viewingPolicy.policyName)
    ) {
      setViewingPolicy(updated);
    }
  }, [policies, viewingPolicy]);

  // Render preview of the uploaded file in its original format (.docx or .pdf)
  useEffect(() => {
    if (!viewingPolicy || !previewContainerRef.current) return;

    let cancelled = false;
    const container = previewContainerRef.current;
    container.innerHTML = '';
    setIsRenderingPreview(true);

    const renderDocument = async () => {
      const lowerFileName = String(viewingPolicy.fileName || '').toLowerCase();
      const isDocx =
        lowerFileName.endsWith('.docx') ||
        String(viewingPolicy.fileType || '').includes('word');

      const rawData = viewingPolicy.fileData || viewingPolicy.pdfData || '';
      const hasDocxBinary =
        isDocx &&
        rawData &&
        !rawData.startsWith('data:application/pdf');

      try {
        if (hasDocxBinary) {
          const bytes = dataUrlToUint8Array(rawData);
          const arrayBuffer = bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength
          ) as ArrayBuffer;

          try {
            await renderAsync(arrayBuffer, container, undefined, {
              className: 'docx-viewer',
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false
            });
            if (!cancelled && container.innerHTML.trim().length > 0) {
              setIsRenderingPreview(false);
              return;
            }
          } catch {
            // Fall through to mammoth HTML conversion if docx-preview encounters an issue
          }

          const mammothResult = await mammoth.convertToHtml({ arrayBuffer });
          if (!cancelled && mammothResult.value) {
            container.innerHTML = `
              <div class="bg-white text-slate-900 p-8 md:p-12 rounded-xl shadow-lg max-w-4xl mx-auto min-h-[65vh] prose prose-slate max-w-none leading-relaxed">
                ${mammothResult.value}
              </div>
            `;
            setIsRenderingPreview(false);
            return;
          }
        }

        if (isDocx && viewingPolicy.docxHtml) {
          if (!cancelled) {
            container.innerHTML = `
              <div class="bg-white text-slate-900 p-8 md:p-12 rounded-xl shadow-lg max-w-4xl mx-auto min-h-[65vh] prose prose-slate max-w-none leading-relaxed">
                ${viewingPolicy.docxHtml}
              </div>
            `;
            setIsRenderingPreview(false);
          }
          return;
        }

        // Render PDF data (either uploaded .pdf or fallback pdfData) onto <canvas> elements
        const pdfDataUrl = viewingPolicy.fileData?.startsWith('data:application/pdf')
          ? viewingPolicy.fileData
          : viewingPolicy.pdfData || viewingPolicy.fileData || '';

        if (pdfDataUrl) {
          const pdfBytes = dataUrlToUint8Array(pdfDataUrl);
          const loadingTask = pdfjsLib.getDocument({
            data: pdfBytes,
            disableWorkerRendering: true
          });
          const pdfDoc = await loadingTask.promise;

          if (cancelled) return;

          const pagesWrapper = document.createElement('div');
          pagesWrapper.className = 'flex flex-col items-center gap-6 py-2';
          container.appendChild(pagesWrapper);

          for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            if (cancelled) return;
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });

            const pageCard = document.createElement('div');
            pageCard.className = 'bg-white shadow-xl rounded-lg overflow-hidden max-w-full';

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.maxWidth = '100%';
            canvas.style.height = 'auto';
            canvas.style.display = 'block';

            pageCard.appendChild(canvas);
            pagesWrapper.appendChild(pageCard);

            if (ctx) {
              await page.render({
                canvas: null,
                canvasContext: ctx,
                viewport
              }).promise;
            }
          }

          if (!cancelled) {
            setIsRenderingPreview(false);
          }
          return;
        }
      } catch {
        // Fallback view if binary cannot be decoded
      }

      if (!cancelled) {
        container.innerHTML = `
          <div class="bg-white text-slate-900 p-8 md:p-12 rounded-xl shadow-lg max-w-4xl mx-auto min-h-[50vh]">
            <h1 class="text-2xl font-bold text-slate-900 mb-2">${viewingPolicy.policyName}</h1>
            <p class="text-sm text-slate-500 mb-6">Policy ID: ${viewingPolicy.policyId} &bull; File: ${viewingPolicy.fileName}</p>
            <hr class="my-4 border-slate-200" />
            <p class="text-slate-700">Document preview loaded for ${viewingPolicy.fileName}.</p>
          </div>
        `;
        setIsRenderingPreview(false);
      }
    };

    renderDocument();

    return () => {
      cancelled = true;
    };
  }, [viewingPolicy]);

  if (!isSuperAdminRole && !isEmployeeRole && !isHRRole && !isDirectorRole) {
    return <div className="min-h-[60vh]" />;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
    const isDocx =
      lowerName.endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isPdf && !isDocx) {
      showToast('Invalid File Type', 'Please upload a .pdf or .docx file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);
  };

  const runWithTimeout = async <T,>(promise: Promise<T>, timeoutMs = 1500): Promise<T | undefined> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<undefined>(resolve => {
          timer = setTimeout(() => resolve(undefined), timeoutMs);
        })
      ]);
    } catch {
      return undefined;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const buildFirestorePolicyPayload = (record: PolicyRecord): Record<string, string> => {
    const safeDocxHtml = record.docxHtml && record.docxHtml.length < 300000 ? record.docxHtml : '';
    const payload: Record<string, string> = {
      id: record.id,
      policyId: record.policyId,
      policyName: record.policyName,
      fileName: record.fileName,
      fileType: record.fileType,
      pdfData: record.pdfData && record.pdfData.length < 300000 ? record.pdfData : '',
      docxHtml: safeDocxHtml,
      createdAt: record.createdAt
    };
    if (record.fileData && (safeDocxHtml.length + record.fileData.length) < 650000) {
      payload.fileData = record.fileData;
    }
    return payload;
  };

  const handleStartEditPolicy = (item: PolicyRecord) => {
    const latestMatch =
      policies.find(p => p.policyId.toLowerCase() === item.policyId.toLowerCase()) || item;
    setEditingPolicy(latestMatch);
    setPolicyName(latestMatch.policyName);
    setPolicyId(latestMatch.policyId);
    setSelectedFile(null);
    setSelectedFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleUpdatePolicy = async () => {
    if (!editingPolicy) return;
    const trimmedName = policyName.trim();
    const lockedPolicyId = editingPolicy.policyId.trim();

    if (!trimmedName) {
      showToast('Missing Policy Name', 'Please enter a Policy Name.');
      return;
    }

    setIsSaving(true);
    try {
      const existingInState = policies.find(
        p => p.policyId.toLowerCase() === lockedPolicyId.toLowerCase()
      );
      let updatedFileName = editingPolicy.fileName || existingInState?.fileName || '';
      let updatedFileType = editingPolicy.fileType || existingInState?.fileType || 'application/pdf';
      let updatedFileData = editingPolicy.fileData || existingInState?.fileData || '';
      let updatedDocxHtml = editingPolicy.docxHtml || existingInState?.docxHtml || '';
      let updatedPdfData = editingPolicy.pdfData || existingInState?.pdfData || '';

      if (selectedFile) {
        const lowerName = selectedFile.name.toLowerCase();
        const isPdf = lowerName.endsWith('.pdf') || selectedFile.type === 'application/pdf';
        const rawDataUrl = await readFileAsDataUrl(selectedFile);

        let extractedDocxHtml = '';
        if (!isPdf) {
          try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const res = await mammoth.convertToHtml({ arrayBuffer });
            if (res.value) {
              extractedDocxHtml = res.value;
            }
          } catch {}
        }

        updatedFileName = selectedFile.name;
        updatedFileType = isPdf
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        updatedFileData = rawDataUrl;
        updatedDocxHtml = extractedDocxHtml;
        updatedPdfData = '';
      }

      const docId = editingPolicy.id || existingInState?.id || sanitizeDocId(lockedPolicyId);
      const record: PolicyRecord = {
        id: docId,
        policyId: lockedPolicyId,
        policyName: trimmedName,
        fileName: updatedFileName,
        fileType: updatedFileType,
        fileData: updatedFileData || '',
        pdfData: updatedPdfData,
        docxHtml: updatedDocxHtml,
        createdAt: new Date().toISOString()
      };

      unmarkPolicyDeletedLocally(lockedPolicyId, docId);
      fileContentCacheRef.current.set(lockedPolicyId.toLowerCase(), {
        fileName: record.fileName,
        fileData: record.fileData,
        pdfData: record.pdfData,
        docxHtml: record.docxHtml
      });

      const firestorePayload = buildFirestorePolicyPayload(record);

      await Promise.all([
        runWithTimeout(
          fetch('/api/policies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
          }),
          6000
        ),
        runWithTimeout(
          Promise.resolve().then(() =>
            setDoc(doc(db, 'policies', docId), firestorePayload, { merge: true })
          ),
          6000
        )
      ]);

      setLastActivePolicyId(lockedPolicyId);
      if (viewingPolicy && viewingPolicy.policyId.toLowerCase() === lockedPolicyId.toLowerCase()) {
        setViewingPolicy(record);
      }

      setEditingPolicy(null);
      setPolicyName('');
      setPolicyId('');
      setSelectedFile(null);
      setSelectedFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      showToast(
        'Policy Updated',
        `"${trimmedName}" (${lockedPolicyId}) has been updated in the database.`
      );
    } catch {
      showToast('Update Failed', 'Could not update the policy file.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePolicy = async () => {
    const trimmedName = policyName.trim();
    const trimmedId = policyId.trim();

    if (!trimmedName) {
      showToast('Missing Policy Name', 'Please enter a Policy Name.');
      return;
    }
    if (!trimmedId) {
      showToast('Missing Policy ID', 'Please enter a Policy ID.');
      return;
    }
    if (!selectedFile) {
      showToast('Missing Policy File', 'Please upload a .pdf or .docx file from your device.');
      return;
    }

    setIsSaving(true);
    try {
      const lowerName = selectedFile.name.toLowerCase();
      const isPdf = lowerName.endsWith('.pdf') || selectedFile.type === 'application/pdf';
      const rawDataUrl = await readFileAsDataUrl(selectedFile);

      let extractedDocxHtml = '';
      if (!isPdf) {
        try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const res = await mammoth.convertToHtml({ arrayBuffer });
          if (res.value) {
            extractedDocxHtml = res.value;
          }
        } catch {}
      }

      const docId = sanitizeDocId(trimmedId);
      const record: PolicyRecord = {
        id: docId,
        policyId: trimmedId,
        policyName: trimmedName,
        fileName: selectedFile.name,
        fileType: isPdf
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileData: rawDataUrl,
        pdfData: '',
        docxHtml: extractedDocxHtml,
        createdAt: new Date().toISOString()
      };

      unmarkPolicyDeletedLocally(trimmedId, docId);
      fileContentCacheRef.current.set(trimmedId.toLowerCase(), {
        fileName: record.fileName,
        fileData: record.fileData,
        pdfData: record.pdfData,
        docxHtml: record.docxHtml
      });

      const firestorePayload = buildFirestorePolicyPayload(record);

      await Promise.all([
        runWithTimeout(
          fetch('/api/policies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
          }),
          6000
        ),
        runWithTimeout(
          Promise.resolve().then(() =>
            setDoc(doc(db, 'policies', docId), firestorePayload, { merge: true })
          ),
          6000
        )
      ]);

      setLastActivePolicyId(trimmedId);

      setEditingPolicy(null);
      setPolicyName('');
      setPolicyId('');
      setSelectedFile(null);
      setSelectedFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      showToast('Policy Saved', `"${trimmedName}" (${trimmedId}) has been saved to the database.`);
    } catch {
      showToast('Save Failed', 'Could not process the selected file.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePolicy = async (targetPolicy?: PolicyRecord) => {
    const idToDelete =
      targetPolicy?.policyId ||
      policyId.trim() ||
      lastActivePolicyId ||
      (policies.length > 0 ? policies[0].policyId : '');
    const nameToMatch = targetPolicy?.policyName || policyName.trim();

    const matchedRecord =
      targetPolicy ||
      policies.find(
        p =>
          (idToDelete && p.policyId.toLowerCase() === idToDelete.toLowerCase()) ||
          (nameToMatch && p.policyName.toLowerCase() === nameToMatch.toLowerCase())
      );

    const effectivePolicyId = matchedRecord?.policyId || idToDelete;
    const effectiveDocId = matchedRecord?.id || sanitizeDocId(effectivePolicyId);

    if (!effectivePolicyId && !selectedFile) {
      showToast('Nothing to Delete', 'No policy file is selected or found to delete.');
      return;
    }

    setIsDeleting(true);
    try {
      if (effectivePolicyId) {
        markPolicyDeletedLocally(effectivePolicyId, effectiveDocId);
        fileContentCacheRef.current.delete(effectivePolicyId.toLowerCase());
        setPolicies(prev =>
          prev.filter(
            p =>
              p.policyId.toLowerCase() !== effectivePolicyId.toLowerCase() &&
              p.id.toLowerCase() !== effectiveDocId.toLowerCase()
          )
        );

        await Promise.all([
          runWithTimeout(
            fetch(`/api/policies/${encodeURIComponent(effectivePolicyId)}`, {
              method: 'DELETE'
            }),
            5000
          ),
          effectiveDocId
            ? runWithTimeout(
                Promise.resolve().then(() => deleteDoc(doc(db, 'policies', effectiveDocId))),
                5000
              )
            : Promise.resolve(undefined)
        ]);
      }

      // Clear form inputs if deleting from Add Policy form or if deleting the policy currently being edited
      if (
        !targetPolicy ||
        targetPolicy.policyId.toLowerCase() === policyId.trim().toLowerCase() ||
        (editingPolicy &&
          editingPolicy.policyId.toLowerCase() === effectivePolicyId.toLowerCase())
      ) {
        setEditingPolicy(null);
        setPolicyName('');
        setPolicyId('');
        setSelectedFile(null);
        setSelectedFileName('');
        setLastActivePolicyId('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }

      showToast(
        'Policy Deleted',
        effectivePolicyId
          ? `Policy (${effectivePolicyId}) and its file have been deleted from the database.`
          : 'Selected policy file removed.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewPolicy = (policy: PolicyRecord) => {
    setViewingPolicy(policy);
  };

  const closePreviewModal = () => {
    setViewingPolicy(null);
  };

  return (
    <div className="space-y-6">
      {/* SUB-PAGE 1: ADD POLICY */}
      {activeSubPage === 'ADD_POLICY' && (
        <div
          ref={formContainerRef}
          className="bg-[#0B1528] border border-[#1E2E4E] rounded-2xl p-6 md:p-8 shadow-lg w-full"
        >
          <div className="flex items-center gap-3 pb-5 mb-6 border-b border-[#1E2E4E]">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add Policy</h2>
              <p className="text-xs text-slate-400">
                Enter policy details and upload a .pdf or .docx document from your device.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* 1st Input: Policy Name */}
            <div>
              <label
                htmlFor="policy-name-input"
                className="block text-sm font-semibold text-slate-200 mb-2"
              >
                Policy Name
              </label>
              <input
                id="policy-name-input"
                type="text"
                value={policyName}
                onChange={e => setPolicyName(e.target.value)}
                placeholder="Enter Policy Name"
                className="w-full px-4 py-3 rounded-xl bg-[#060D1A] border border-[#1E2E4E] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* 2nd Input: Policy ID */}
            <div>
              <label
                htmlFor="policy-id-input"
                className="block text-sm font-semibold text-slate-200 mb-2"
              >
                Policy ID
              </label>
              <input
                id="policy-id-input"
                type="text"
                value={policyId}
                onChange={e => {
                  if (!editingPolicy) {
                    setPolicyId(e.target.value);
                  }
                }}
                readOnly={Boolean(editingPolicy)}
                disabled={Boolean(editingPolicy)}
                placeholder="Enter Policy ID"
                className={`w-full px-4 py-3 rounded-xl bg-[#060D1A] border border-[#1E2E4E] text-white placeholder-slate-500 focus:outline-none transition-colors ${
                  editingPolicy
                    ? 'opacity-70 cursor-not-allowed select-none'
                    : 'focus:border-blue-500'
                }`}
              />
            </div>

            {/* Upload .pdf or .docx file from device */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                {editingPolicy
                  ? 'Upload New Policy Document (.pdf or .docx)'
                  : 'Upload Policy Document (.pdf or .docx)'}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
                id="policy-file-upload"
              />
              <label
                htmlFor="policy-file-upload"
                className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-[#1E2E4E] hover:border-blue-500/60 rounded-xl bg-[#060D1A] cursor-pointer transition-colors"
              >
                <Upload className="w-7 h-7 text-blue-400 mb-2" />
                <span className="text-sm font-medium text-slate-200">
                  {selectedFileName
                    ? selectedFileName
                    : editingPolicy
                      ? `Click to upload new .pdf or .docx file from device (Current: ${editingPolicy.fileName})`
                      : 'Click to upload .pdf or .docx file from device'}
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  Supported formats: .pdf, .docx
                </span>
              </label>

              {selectedFileName && (
                <div className="mt-3 flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium truncate">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{selectedFileName}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Save (Green) or Update (Yellow) Action Button */}
            <div className="pt-4 flex flex-wrap items-center gap-4">
              {editingPolicy ? (
                <button
                  type="button"
                  onClick={handleUpdatePolicy}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-slate-950 font-bold text-sm shadow-lg shadow-yellow-900/30 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Updating...' : 'Update'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSavePolicy}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>

          {/* Saved Policies Quick Reference in Add Policy so any saved file can be edited or deleted */}
          {policies.length > 0 && (
            <div className="mt-8 pt-6 border-t border-[#1E2E4E]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Saved Policies in Database ({policies.length})
              </h3>
              <div className="space-y-2.5">
                {policies.map(item => (
                  <div
                    key={item.id || item.policyId}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#060D1A] border border-[#1E2E4E]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {item.policyName}{' '}
                        <span className="text-xs font-mono text-blue-400 ml-1">
                          ({item.policyId})
                        </span>
                      </p>
                      <p className="text-xs text-slate-400 truncate">{item.fileName}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditPolicy(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePolicy(item)}
                        disabled={isDeleting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-PAGE 2: VIEW POLICY */}
      {activeSubPage === 'VIEW_POLICY' && (
        <div className="bg-[#0B1528] border border-[#1E2E4E] rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#1E2E4E]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">View Policy</h2>
                <p className="text-xs text-slate-400">
                  All saved policies with Policy Name, Policy ID, File Name, and View option.
                </p>
              </div>
            </div>
          </div>

          {policies.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-semibold">No Policies Found</p>
              <p className="text-xs text-slate-500 mt-1">
                Go to the Add Policy sub-page to upload and save a policy document.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1E2E4E] text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4">Policy Name</th>
                    <th className="py-3.5 px-4">Policy ID</th>
                    <th className="py-3.5 px-4">File Name</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2E4E]/60 text-sm">
                  {policies.map(policy => (
                    <tr
                      key={policy.id || policy.policyId}
                      className="hover:bg-[#111F38]/60 transition-colors"
                    >
                      <td className="py-4 px-4 font-semibold text-white">
                        {policy.policyName}
                      </td>
                      <td className="py-4 px-4 font-mono text-blue-400">
                        {policy.policyId}
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{policy.fileName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleViewPolicy(policy)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {viewingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0B1528] border border-[#1E2E4E] rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2E4E]">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-semibold">
                    {viewingPolicy.policyId}
                  </span>
                  <h3 className="text-base font-bold text-white truncate">
                    {viewingPolicy.policyName}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  File: {viewingPolicy.fileName}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closePreviewModal}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#060D1A] flex-1 overflow-y-auto relative min-h-[70vh] max-h-[78vh]">
              {isRenderingPreview && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#060D1A]/80 z-10">
                  <span className="text-sm font-medium text-slate-300">
                    Loading document preview...
                  </span>
                </div>
              )}
              <div
                ref={previewContainerRef}
                className="w-full min-h-[68vh] rounded-xl overflow-x-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

