import { LearningData } from '../types';
import { usePersistedState } from './usePersistedState';
import { STORAGE_KEYS, DEFAULT_LEARNING, applyConfirmationFeedback, applyCompletedRound } from '../utils/storage';

export function useLearningData() {
  const [learningData, setLearningData] = usePersistedState<LearningData>(STORAGE_KEYS.learning, DEFAULT_LEARNING);

  const recordConfirmation = (retrievedClub: boolean) => {
    setLearningData((prev) => applyConfirmationFeedback(prev, retrievedClub));
  };

  const recordCompletedRound = () => {
    setLearningData((prev) => applyCompletedRound(prev));
  };

  const resetLearning = () => setLearningData(DEFAULT_LEARNING);

  return { learningData, recordConfirmation, recordCompletedRound, resetLearning };
}
