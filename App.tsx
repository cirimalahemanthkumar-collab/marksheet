import React, { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Dashboard } from './components/Dashboard';
import { AnalysisResult, ProcessingState, SubjectScore } from './types';
import { analyzeMarksheet } from './services/geminiService';
import { Layout, Sparkles, ChevronRight, Users, GraduationCap, BarChart3 } from 'lucide-react';

const App: React.FC = () => {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  // activeResultIndex: -1 indicates Class Average view, 0+ indicates specific student index
  const [activeResultIndex, setActiveResultIndex] = useState<number>(-1); 
  const [classAverageData, setClassAverageData] = useState<AnalysisResult | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle' });

  // Helper to calculate average score for a single result
  const calculateAverageScore = (subjects: SubjectScore[]): number => {
     if (!subjects || subjects.length === 0) return 0;
     const total = subjects.reduce((sum, sub) => sum + sub.score, 0);
     return Math.round(total / subjects.length);
  };

  const calculateClassAverage = (results: AnalysisResult[]): AnalysisResult => {
    if (results.length === 0) throw new Error("No results to average");

    let totalObtainedSum = 0;
    let totalPossibleSum = 0;
    const subjectMap = new Map<string, { total: number, count: number, fullMarks: number }>();

    results.forEach(res => {
      totalObtainedSum += res.totalObtained;
      totalPossibleSum += res.totalPossible;

      res.subjects.forEach(sub => {
        // Normalize subject name to lowercase to group "Math" and "Maths"
        const normKey = sub.subject.trim().toLowerCase(); 
        // Use the display name from the first occurrence
        const current = subjectMap.get(normKey) || { total: 0, count: 0, fullMarks: sub.fullMarks || 100 };
        
        subjectMap.set(normKey, {
          total: current.total + sub.score,
          count: current.count + 1,
          fullMarks: Math.max(current.fullMarks, sub.fullMarks || 100)
        });
      });
    });

    const avgSubjects: SubjectScore[] = Array.from(subjectMap.entries()).map(([key, val]) => ({
      subject: key.charAt(0).toUpperCase() + key.slice(1), // Simple capitalization
      score: Math.round(val.total / val.count),
      fullMarks: val.fullMarks
    }));

    // Recalculate global percentage based on averages
    const avgPercentage = calculateAverageScore(avgSubjects);

    return {
      studentName: "Class Average",
      subjects: avgSubjects,
      totalObtained: Math.round(totalObtainedSum / results.length),
      totalPossible: Math.round(totalPossibleSum / results.length),
      percentage: avgPercentage,
      grade: '', // Removed grade usage
      summary: `This represents the aggregated performance of ${results.length} students. The class average score is ${avgPercentage}.`,
      feedback: [
        "Review subjects with averages below 60 for curriculum adjustments.",
        "Identify top performers for advanced modules.",
        "Organize remedial sessions for students significantly below the class average."
      ]
    };
  };

  const handleAnalyze = async (images: string[]) => {
    setProcessingState({ status: 'processing', message: 'Initializing batch analysis...' });
    setResults([]);
    setClassAverageData(null);

    try {
      // Process all images in parallel
      const analysisPromises = images.map((img, idx) => 
        analyzeMarksheet(img)
          .then(res => ({ status: 'fulfilled' as const, value: res }))
          .catch(err => ({ status: 'rejected' as const, reason: err }))
      );

      const outcomes = await Promise.all(analysisPromises);
      
      const successfulResults: AnalysisResult[] = [];
      let failureCount = 0;

      outcomes.forEach(outcome => {
        if (outcome.status === 'fulfilled') {
          successfulResults.push(outcome.value);
        } else {
          failureCount++;
          console.error("Analysis failed for one document:", outcome.reason);
        }
      });

      if (successfulResults.length > 0) {
        setResults(successfulResults);
        
        // Calculate class average if we have results
        const average = calculateClassAverage(successfulResults);
        setClassAverageData(average);
        
        // Set default view to Class Average
        setActiveResultIndex(-1); 

        setProcessingState({ 
          status: 'success', 
          message: failureCount > 0 
            ? `Processed ${successfulResults.length} documents. ${failureCount} failed.` 
            : undefined 
        });
      } else {
        setProcessingState({ 
          status: 'error', 
          message: 'Failed to analyze documents. Please check image quality and try again.' 
        });
      }

    } catch (err: any) {
      setProcessingState({ status: 'error', message: err.message || 'Batch processing failed unexpectedly.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              Marksheet Analytics
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Powered by Gemini 2.0 Flash</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Intro - Only show if no results yet to save space */}
        {results.length === 0 && processingState.status !== 'processing' && (
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
              Batch Process Student Reports
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Upload multiple marksheets at once. AI will extract data, visualize performance, and organize insights for the entire class instantly.
            </p>
          </div>
        )}

        <ImageUploader 
          onAnalyze={handleAnalyze} 
          isLoading={processingState.status === 'processing'}
        />

        {/* Status Messages */}
        {processingState.status === 'error' && (
          <div className="max-w-3xl mx-auto mb-8 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3 animate-pulse shadow-sm">
             <div className="p-2 bg-red-100 rounded-full"><Sparkles className="w-5 h-5" /></div>
             <span className="font-medium">{processingState.message}</span>
          </div>
        )}
        
        {processingState.message && processingState.status === 'success' && results.length > 0 && (
           <div className="max-w-3xl mx-auto mb-8 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl flex items-center gap-3 shadow-sm">
             <div className="p-2 bg-green-100 rounded-full"><Sparkles className="w-5 h-5" /></div>
             <span className="font-medium">{processingState.message}</span>
           </div>
        )}

        {/* Results View */}
        {results.length > 0 && (
          <div className="space-y-8 animate-fade-in-up">
            
            {/* Student Selector List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-1 overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-700">Analyzed Students ({results.length})</h3>
               </div>
               
               <div className="flex overflow-x-auto p-4 gap-4 scrollbar-hide">
                  {/* Class Average Card */}
                  {classAverageData && (
                    <div 
                      onClick={() => setActiveResultIndex(-1)}
                      className={`
                        min-w-[240px] p-5 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between
                        ${activeResultIndex === -1 
                          ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500 shadow-md' 
                          : 'bg-white border-gray-200 hover:border-amber-300 hover:shadow-md'
                        }
                      `}
                    >
                       <div className="flex items-center gap-3 mb-4">
                          <div className={`p-2.5 rounded-full ${activeResultIndex === -1 ? 'bg-amber-200 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>
                            <BarChart3 className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-lg">Class Average</div>
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Overall</div>
                          </div>
                       </div>
                       
                       <div className="mt-2">
                          <div className="text-sm text-gray-500 font-medium mb-1">Average Score</div>
                          <div className="text-3xl font-extrabold text-amber-600">
                             {calculateAverageScore(classAverageData.subjects)}
                          </div>
                       </div>

                       {activeResultIndex === -1 && (
                         <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                            <div className="w-4 h-4 bg-amber-50 border-b border-r border-amber-500 rotate-45"></div>
                         </div>
                       )}
                    </div>
                  )}

                  {/* Individual Students */}
                  {results.map((res, idx) => {
                    const avg = calculateAverageScore(res.subjects);
                    return (
                      <div 
                        key={idx}
                        onClick={() => setActiveResultIndex(idx)}
                        className={`
                          min-w-[240px] p-5 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between
                          ${activeResultIndex === idx 
                            ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 shadow-md' 
                            : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
                          }
                        `}
                      >
                         <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2.5 rounded-full ${activeResultIndex === idx ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                              <GraduationCap className="w-6 h-6" />
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-bold text-gray-900 text-lg truncate" title={res.studentName}>
                                {res.studentName}
                              </div>
                              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Student</div>
                            </div>
                         </div>
                         
                         <div className="mt-2">
                            <div className="text-sm text-gray-500 font-medium mb-1">Average Score</div>
                            <div className="text-3xl font-extrabold text-indigo-600">
                               {avg}
                            </div>
                         </div>

                         {activeResultIndex === idx && (
                           <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                              <div className="w-4 h-4 bg-indigo-50 border-b border-r border-indigo-500 rotate-45"></div>
                           </div>
                         )}
                      </div>
                    );
                  })}
               </div>
            </div>

            {/* Detailed Dashboard */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-6">
                 <h2 className="text-2xl font-bold text-gray-900">
                    Detailed Report: <span className="text-indigo-600">
                      {activeResultIndex === -1 && classAverageData 
                        ? "Class Average Overview" 
                        : results[activeResultIndex]?.studentName
                      }
                    </span>
                 </h2>
                 <ChevronRight className="w-6 h-6 text-gray-400" />
              </div>
              
              {activeResultIndex === -1 && classAverageData ? (
                 <Dashboard key="average" data={classAverageData} />
              ) : (
                 <Dashboard key={activeResultIndex} data={results[activeResultIndex]} />
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;