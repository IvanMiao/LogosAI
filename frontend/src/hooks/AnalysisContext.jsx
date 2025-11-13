import React, { createContext, useContext } from "react";
import { useAnalysis } from "@/hooks/useAnalysis";

const AnalysisContext = createContext(null);

export function AnalysisProvider({ children }) {
	const analysisData = useAnalysis();

	return (
		<AnalysisContext.Provider value={analysisData}>
			{children}
		</AnalysisContext.Provider>
	);
}

export function useAnalysisContext() {
	const context = useContext(AnalysisContext);

	if (!context) {
		throw new Error('useAnalysisContext must be within an AnalysisProvider');
	}

	return context;
}
