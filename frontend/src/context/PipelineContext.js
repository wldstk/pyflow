import { createContext, useContext } from 'react';

export const PipelineContext = createContext({ runFromNode: null, runSingleNode: null });

export const usePipelineContext = () => useContext(PipelineContext);
