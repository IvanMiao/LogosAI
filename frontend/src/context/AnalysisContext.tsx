import { createContext, useContext, ReactNode } from "react";
import { useAnalysis, UseAnalysisReturn } from "@/hooks/useAnalysis";

const AnalysisContext = createContext<UseAnalysisReturn | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
	const analysisData = useAnalysis();

	return (
		<AnalysisContext.Provider value={analysisData}>
			{children}
		</AnalysisContext.Provider>
	);
}

export function useAnalysisContext(): UseAnalysisReturn {
	const context = useContext(AnalysisContext);

	if (!context) {
		throw new Error('useAnalysisContext must be within an AnalysisProvider');
	}

	return context;
}
