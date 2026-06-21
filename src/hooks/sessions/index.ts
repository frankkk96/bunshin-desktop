import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sessionsApi } from '@/lib/tauri/service/sessions'

const KEY = ['sessions'] as const
const RUNNING_KEY = [...KEY, 'running'] as const

export function useSessions() {
  return useQuery({ queryKey: KEY, queryFn: sessionsApi.list })
}

export function useSessionMessages(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id, 'messages'],
    queryFn: () => sessionsApi.getMessages(id!),
    enabled: !!id,
  })
}

export function useRunningSessions() {
  return useQuery({
    queryKey: RUNNING_KEY,
    queryFn: sessionsApi.listRunning,
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
  })
}

export function useStartSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: sessionsApi.start,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: RUNNING_KEY })
    },
  })
}

export function useResumeSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => sessionsApi.resume(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: RUNNING_KEY }),
  })
}

export function useStopSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => sessionsApi.stop(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: RUNNING_KEY }),
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => sessionsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRenameSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string | null }) =>
      sessionsApi.rename(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useSetSessionFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      sessionsApi.setFavorite(id, favorite),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useSendUserMessage() {
  return useMutation({
    mutationFn: sessionsApi.send,
  })
}

export function useCancelQuery() {
  return useMutation({
    mutationFn: (id: string) => sessionsApi.cancel(id),
  })
}

export function useRespondToPermission() {
  return useMutation({
    mutationFn: sessionsApi.respondToPermission,
  })
}

export function useClearSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => sessionsApi.clear(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: [...KEY, id, 'messages'] })
      qc.invalidateQueries({ queryKey: RUNNING_KEY })
    },
  })
}

