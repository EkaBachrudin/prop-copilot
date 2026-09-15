import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ListUnitsParams } from '../lib/api';
import type { BlockInfo, CreateUnitInput, PaginationMeta, UnitListItem, UpdateUnitInput } from '../lib/types';

interface UnitsResult {
  block: BlockInfo;
  units: UnitListItem[];
  pagination: PaginationMeta;
}

export function useUnits(blockId: string, params: ListUnitsParams) {
  return useQuery<UnitsResult>({
    queryKey: ['units', blockId, params],
    queryFn: async () => (await api.getUnits(blockId, params)).data,
    enabled: Boolean(blockId),
  });
}

export function useUnitMutations(blockId: string, propertyId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['units', blockId] });
    queryClient.invalidateQueries({ queryKey: ['propertyDetail', propertyId] });
    queryClient.invalidateQueries({ queryKey: ['properties'] });
  };

  const createUnit = useMutation({
    mutationFn: (input: CreateUnitInput) => api.createUnit(blockId, input),
    onSuccess: invalidate,
  });

  const updateUnit = useMutation({
    mutationFn: ({ unitId, input }: { unitId: string; input: UpdateUnitInput }) =>
      api.updateUnit(unitId, input),
    onSuccess: invalidate,
  });

  const deleteUnit = useMutation({
    mutationFn: (unitId: string) => api.deleteUnit(unitId),
    onSuccess: invalidate,
  });

  return {
    createUnit,
    updateUnit,
    deleteUnit,
    isCreating: createUnit.isPending,
    isUpdating: updateUnit.isPending,
    isDeleting: deleteUnit.isPending,
  };
}
