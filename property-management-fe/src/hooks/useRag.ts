import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useRagDocuments() {
  return useQuery({
    queryKey: ['rag-documents'],
    queryFn: async () => (await api.getRagDocuments()).data,
  });
}

export function useRagStats() {
  return useQuery({
    queryKey: ['rag-stats'],
    queryFn: async () => (await api.getRagStats()).data,
  });
}

export function useRagMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['rag-documents'] });
    void queryClient.invalidateQueries({ queryKey: ['rag-stats'] });
  };

  const uploadDocument = useMutation({
    mutationFn: (file: File) => api.uploadRagDocument(file),
    onSuccess: invalidate,
  });

  const deleteDocument = useMutation({
    mutationFn: (id: string) => api.deleteRagDocument(id),
    onSuccess: invalidate,
  });

  const reindex = useMutation({
    mutationFn: () => api.reindexRag(),
    onSuccess: invalidate,
  });

  const search = useMutation({
    mutationFn: ({ query, k }: { query: string; k?: number }) => api.searchRag(query, k),
  });

  return {
    uploadDocument,
    deleteDocument,
    reindex,
    search,
    isUploading: uploadDocument.isPending,
    isDeleting: deleteDocument.isPending,
    isReindexing: reindex.isPending,
    isSearching: search.isPending,
  };
}
