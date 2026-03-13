import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetSourceRatings, 
  useRateSource, 
  getGetSourcesQueryKey, 
  getGetSourceRatingsQueryKey 
} from "@workspace/api-client-react";

export function useRatings() {
  return useGetSourceRatings();
}

export function useSubmitRating() {
  const queryClient = useQueryClient();
  
  return useRateSource({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSourcesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSourceRatingsQueryKey() });
      }
    }
  });
}
