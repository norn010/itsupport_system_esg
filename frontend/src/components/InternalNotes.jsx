import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const InternalNotes = ({ ticketId }) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [ticketId]);

  const fetchNotes = async () => {
    try {
      const { data } = await axios.get(`/api/tickets/${ticketId}/notes`);
      setNotes(data);
    } catch (error) {
      console.error('Failed to fetch internal notes', error);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setLoading(true);
    try {
      const { data } = await axios.post(`/api/tickets/${ticketId}/notes`, { note: newNote });
      setNotes([{...data.note, author_name: user?.full_name || user?.username, author_role: user?.role}, ...notes]);
      setNewNote('');
      fetchNotes();
    } catch (error) {
      console.error('Failed to add note', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await axios.delete(`/api/tickets/${ticketId}/notes/${id}`);
      setNotes(notes.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete note', error);
    }
  };

  return (
    <div className="card mt-6 border-l-4 border-l-yellow-500 bg-yellow-50/30">
      <h2 className="text-xl font-bold mb-4 text-yellow-800 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Internal Notes (Staff Only)
      </h2>
      
      <form onSubmit={handleAddNote} className="mb-6">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a private note for staff..."
          className="input min-h-[80px] bg-white text-sm mb-2"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !newNote.trim()} className="btn bg-yellow-600 hover:bg-yellow-700 text-white text-sm py-1.5 px-4 shadow-sm">
          {loading ? 'Adding...' : 'Add Internal Note'}
        </button>
      </form>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {notes.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No internal notes yet.</p>
        ) : (
          notes.map(note => (
            <div key={note.id} className="bg-white p-3 rounded-lg shadow-sm border border-yellow-100">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-semibold text-gray-700">
                  {note.author_name} ({note.author_role})
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">
                    {new Date(note.created_at).toLocaleString()}
                  </span>
                  {(note.created_by === user?.id || user?.role === 'MANAGER') && (
                    <button onClick={() => handleDeleteNote(note.id)} className="text-red-400 hover:text-red-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.note}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InternalNotes;
