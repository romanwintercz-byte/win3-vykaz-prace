import React, { useState, useMemo } from 'react';
import { Project } from '../types';

interface ProjectManagerProps {
    isOpen: boolean;
    onClose: () => void;
    projects: Project[];
    onAddProject: (name: string) => void;
    onUpdateProject: (project: Project) => void;
    onArchiveProject: (id: string, isArchived: boolean) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ isOpen, onClose, projects, onAddProject, onUpdateProject, onArchiveProject }) => {
    const [newProjectName, setNewProjectName] = useState('');
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    const sortedProjects = useMemo(() => {
        return [...projects].sort((a, b) => {
            if (a.archived !== b.archived) {
                return a.archived ? 1 : -1;
            }
            return a.name.localeCompare(b.name);
        });
    }, [projects]);

    const handleAddProject = (e: React.FormEvent) => {
        e.preventDefault();
        if (newProjectName.trim()) {
            onAddProject(newProjectName.trim());
            setNewProjectName('');
        }
    };
    
    const handleStartEdit = (project: Project) => {
        setEditingProject({ ...project });
    };

    const handleCancelEdit = () => {
        setEditingProject(null);
    };

    const handleSaveEdit = () => {
        if (editingProject && editingProject.name.trim()) {
            onUpdateProject(editingProject);
            setEditingProject(null);
        }
    };
    
    if (!isOpen) {
        return null;
    }

    const handleModalContentClick = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity"
            onClick={onClose}
        >
            <div
                className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 w-full max-w-lg transform transition-all"
                onClick={handleModalContentClick}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-900">Správa projektů</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <CloseIcon />
                    </button>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {sortedProjects.map(project => (
                        <div key={project.id} className={`flex items-center justify-between p-3 rounded-lg border ${project.archived ? 'bg-slate-100 border-slate-200' : 'bg-slate-50 border-slate-200'}`}>
                            {editingProject?.id === project.id ? (
                                <div className="flex-grow flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }}></div>
                                    <input 
                                        type="text"
                                        value={editingProject.name}
                                        onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                                        className="px-2 py-1 bg-white text-slate-800 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-full"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }}></div>
                                    <span className={`font-semibold ${project.archived ? 'text-slate-500 italic' : ''}`}>{project.name}</span>
                                    {project.archived && <span className="text-xs text-slate-500">(Archivováno)</span>}
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                               {editingProject?.id === project.id ? (
                                    <>
                                        <button onClick={handleSaveEdit} className="p-1.5 text-green-600 hover:bg-green-100 rounded-md"><SaveIcon /></button>
                                        <button onClick={handleCancelEdit} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-md"><CancelIcon /></button>
                                    </>
                               ) : (
                                   <>
                                        <button onClick={() => onArchiveProject(project.id, !project.archived)} className={`p-1.5 hover:bg-slate-200 rounded-md ${project.archived ? 'text-green-600' : 'text-slate-500'}`} aria-label={project.archived ? 'Obnovit' : 'Archivovat'}>
                                            {project.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
                                        </button>
                                        <button onClick={() => handleStartEdit(project)} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-md"><PencilIcon /></button>
                                   </>
                               )}
                            </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleAddProject} className="mt-6 flex gap-2">
                    <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Název nového projektu"
                        className="flex-grow px-4 py-2 bg-white text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition"
                        disabled={!newProjectName.trim()}
                    >
                        Přidat projekt
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- ICONS ---
const PencilIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;
const TrashIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const SaveIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const CancelIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const CloseIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;
const ArchiveIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>;
const UnarchiveIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm1.5 8.5a.5.5 0 01.5-.5h8a.5.5 0 010 1H4a.5.5 0 01-.5-.5zM4 12a.5.5 0 01.5-.5h8a.5.5 0 010 1H4a.5.5 0 01-.5-.5z" clipRule="evenodd" /><path d="M5 3a2 2 0 00-2 2v1.5a.5.5 0 001 0V5a1 1 0 011-1h10a1 1 0 011 1v1.5a.5.5 0 001 0V5a2 2 0 00-2-2H5z" /></svg>;