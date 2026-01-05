import React, { useRef, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LabelList
} from 'recharts';
import { Download, AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { AnalysisResult } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

interface DashboardProps {
  data: AnalysisResult;
}

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const COLORS = ['#4F46E5', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null); 

  // Calculate Average Score directly from subjects to ensure data consistency
  const averageScore = useMemo(() => {
    if (!data.subjects || data.subjects.length === 0) return 0;
    const total = data.subjects.reduce((sum, sub) => sum + sub.score, 0);
    return Math.round(total / data.subjects.length);
  }, [data.subjects]);

  // Prepare Data for Pie Chart (Total Score: Obtained vs Lost)
  const pieData = useMemo(() => {
    const obtained = data.totalObtained;
    // Ensure totalPossible is at least totalObtained to avoid negative 'Lost'
    const possible = Math.max(data.totalPossible, obtained) || 100; 
    const lost = possible - obtained;
    
    return [
      { name: 'Obtained', value: obtained, fill: '#4F46E5' },
      { name: 'Lost', value: lost, fill: '#E5E7EB' }
    ];
  }, [data.totalObtained, data.totalPossible]);

  // Prepare Data for Bar Chart (Subjects + Average)
  const barData = useMemo(() => {
    return [
      ...data.subjects,
      { subject: 'Average', score: averageScore, isAverage: true }
    ];
  }, [data.subjects, averageScore]);

  const handleDownloadPDF = async () => {
    if (!dashboardRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // 1. Header Information
      doc.setFontSize(22);
      doc.setTextColor(79, 70, 229);
      doc.text("Performance Analytics Report", pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Name: ${data.studentName}`, 20, 40);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 48);
      
      doc.setDrawColor(200);
      doc.line(20, 55, pageWidth - 20, 55);

      // 2. Average Score Highlight
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(`Average Score: ${averageScore}`, 20, 70);

      let currentY = 85;

      // 3. Capture Charts Area
      const chartsElement = document.getElementById('charts-container');
      
      if (chartsElement) {
         const canvas = await html2canvas(chartsElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
         });
         
         const imgData = canvas.toDataURL('image/png');
         const imgWidth = pageWidth - 40; 
         const imgHeight = (canvas.height * imgWidth) / canvas.width;
         
         // Check fit
         if (currentY + imgHeight > pageHeight - 20) {
            doc.addPage();
            currentY = 20;
         }

         doc.addImage(imgData, 'PNG', 20, currentY, imgWidth, imgHeight);
         currentY += imgHeight + 10;
      }

      // 4. Summary & Feedback Text
      if (currentY > pageHeight - 60) {
         doc.addPage();
         currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text("Analysis Summary", 20, currentY);
      currentY += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(80);
      const splitSummary = doc.splitTextToSize(data.summary, pageWidth - 40);
      doc.text(splitSummary, 20, currentY);
      currentY += (splitSummary.length * 5) + 10;

      // Table of marks
      const tableData = data.subjects.map(s => [s.subject, s.score]);
      
      autoTable(doc, {
        startY: currentY,
        head: [['Subject', 'Score']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 10, cellPadding: 3 },
      });

      doc.save(`${data.studentName.replace(/\s+/g, '_')}_Analytics.pdf`);
    } catch (error) {
      console.error("PDF Generation Error", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" ref={dashboardRef}>
      {/* Simplified Header Stats */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full">
                <TrendingUp className="w-8 h-8" />
            </div>
            <div>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Average Score</p>
                <p className="text-4xl font-extrabold text-gray-900">{averageScore}</p>
            </div>
        </div>

        <button 
          onClick={handleDownloadPDF}
          disabled={isGeneratingPdf}
          className={`
            bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl shadow-lg shadow-indigo-200 
            transition-all flex items-center justify-center gap-3 font-semibold text-lg
            ${isGeneratingPdf ? 'opacity-75 cursor-wait' : 'hover:-translate-y-1'}
          `}
        >
          {isGeneratingPdf ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          {isGeneratingPdf ? 'Generating PDF...' : 'Download Report'}
        </button>
      </div>

      {/* Charts Section */}
      <div id="charts-container" className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-8 border-b pb-4">Performance Visualization</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Bar Chart */}
          <div className="h-96 w-full">
             <h4 className="text-sm font-semibold text-gray-500 mb-6 text-center uppercase tracking-wide">Subject Scores & Average</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                    dataKey="subject" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#4B5563', fontSize: 11, fontWeight: 500}} 
                    dy={10} 
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                />
                <YAxis 
                    hide 
                    domain={[0, (dataMax: number) => Math.min(100, Math.max(dataMax * 1.1, 100))]} 
                /> 
                <Tooltip 
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                />
                <Bar dataKey="score" radius={[8, 8, 8, 8]} barSize={50} isAnimationActive={false}>
                  {barData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={(entry as any).isAverage ? '#F59E0B' : COLORS[index % COLORS.length]} 
                    />
                  ))}
                  <LabelList 
                    dataKey="score" 
                    position="top" 
                    fill="#374151" 
                    fontSize={14} 
                    fontWeight="bold" 
                    formatter={(val: number) => `${val}`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="h-96 w-full flex flex-col items-center">
            <h4 className="text-sm font-semibold text-gray-500 mb-6 text-center uppercase tracking-wide">Total Score Distribution</h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  innerRadius={60}
                  dataKey="value"
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                {/* Center Label for Total Score */}
                <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-500 text-sm font-medium">
                  Obtained
                </text>
                <text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle" className="fill-indigo-600 text-xl font-bold">
                  {data.totalObtained}
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Insights & Feedback */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-indigo-500" />
              Analysis Summary
            </h3>
            <p className="text-gray-600 leading-relaxed text-lg">
              {data.summary}
            </p>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Improvement Plan</h3>
            <ul className="space-y-4">
              {data.feedback.map((item, idx) => (
                <li key={idx} className="flex items-start gap-4">
                  <div className="min-w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-gray-700 font-medium">{item}</p>
                </li>
              ))}
            </ul>
         </div>
      </div>
    </div>
  );
};