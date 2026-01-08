
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface AnalyticsChartsProps {
    deptData: any[];
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ deptData }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6">Répartition par Département</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={deptData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {deptData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe', '#f59e0b'][index % 6]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6">Activité RH</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deptData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="value" fill="#1e3a8a" radius={[10, 10, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsCharts;
