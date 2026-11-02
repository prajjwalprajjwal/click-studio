'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Eye,
  Key,
  ArrowLeft,
  RefreshCw,
  Code2,
  Play,
  Terminal,
  Cpu,
  Clock
} from 'lucide-react';
import { AppletRecord } from '@/lib/db';
import OledSimulator from '@/components/OledSimulator';

export default function AdminModerationDashboard() {
  const [adminKey, setAdminKey] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [applets, setApplets] = useState<AppletRecord[]>([]);
  const [selectedApplet, setSelectedApplet] = useState<AppletRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('pending_review');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'js' | 'cpp_h' | 'cpp_source'>('js');

  const fetchAdminApplets = React.useCallback(async (keyToUse: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/applets', {
        headers: {
          Authorization: `Bearer ${keyToUse}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid admin secret key');
      }

      setApplets(data.applets);
      setIsAuthenticated(true);
      sessionStorage.setItem('click_admin_secret', keyToUse);
      if (data.applets.length > 0) {
        setSelectedApplet((prev: AppletRecord | null) => prev ?? data.applets[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check stored admin key on mount
  useEffect(() => {
    const savedKey = sessionStorage.getItem('click_admin_secret');
    if (savedKey) {
      setAdminKey(savedKey);
      fetchAdminApplets(savedKey);
    }
  }, [fetchAdminApplets]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey.trim()) {
      fetchAdminApplets(adminKey.trim());
    }
  };

  const handleModerate = async (id: string, action: 'approve' | 'reject') => {
    let reason = undefined;
    if (action === 'reject') {
      reason = window.prompt('Enter rejection reason (optional):') || 'Did not meet submission guidelines';
    }

    try {
      const res = await fetch('/api/admin/applets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`
        },
        body: JSON.stringify({
          id,
          action,
          rejectionReason: reason
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Action failed');
        return;
      }

      // Update local state
      setApplets(prev =>
        prev.map(app => (app.id === id ? { ...app, status: action === 'approve' ? 'approved' : 'rejected' } : app))
      );

      if (selectedApplet && selectedApplet.id === id) {
        setSelectedApplet(prev => prev ? { ...prev, status: action === 'approve' ? 'approved' : 'rejected' } : null);
      }
    } catch (e: any) {
      alert('Error updating status: ' + e.message);
    }
  };

  const filteredApplets = applets.filter(app => {
    if (filterStatus === 'all') return true;
    return app.status === filterStatus;
  });

  const pendingCount = applets.filter(a => a.status === 'pending_review').length;

  return (
    <div className="admin-container">
      {/* Admin Navbar */}
      <header className="admin-header">
        <div className="admin-brand">
          <Link href="/" className="back-link">
            <ArrowLeft size={16} />
            <span>Click Studio</span>
          </Link>
          <div className="admin-badge">
            <ShieldAlert size={15} />
            <span>MODERATION PIPELINE</span>
          </div>
        </div>

        {isAuthenticated && (
          <div className="admin-user-info">
            <span className="pending-pill">
              {pendingCount} Pending Review
            </span>
            <button
              type="button"
              className="btn-refresh"
              onClick={() => fetchAdminApplets(adminKey)}
              disabled={isLoading}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="btn-logout"
              onClick={() => {
                sessionStorage.removeItem('click_admin_secret');
                setIsAuthenticated(false);
                setAdminKey('');
              }}
            >
              Lock Dashboard
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      {!isAuthenticated ? (
        <div className="admin-login-card">
          <div className="lock-icon-wrapper">
            <Key size={28} className="text-cyan" />
          </div>
          <h2>Admin Authentication</h2>
          <p>
            Please enter the <code>ADMIN_SECRET_KEY</code> defined in your Click Studio environment configuration to access moderation tools.
          </p>

          {errorMsg && (
            <div className="alert-error-box">
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Secret Key</label>
              <input
                type="password"
                required
                placeholder="Enter ADMIN_SECRET_KEY"
                value={adminKey}
                onChange={e => setAdminKey(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-login" disabled={isLoading}>
              {isLoading ? 'Verifying Key...' : 'Unlock Moderation Panel'}
            </button>
          </form>
        </div>
      ) : (
        <div className="admin-dashboard-layout">
          {/* Left Column: Submissions Queue */}
          <aside className="admin-sidebar-queue">
            <div className="queue-filter-tabs">
              <button
                type="button"
                className={`q-tab ${filterStatus === 'pending_review' ? 'active' : ''}`}
                onClick={() => setFilterStatus('pending_review')}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                className={`q-tab ${filterStatus === 'approved' ? 'active' : ''}`}
                onClick={() => setFilterStatus('approved')}
              >
                Approved
              </button>
              <button
                type="button"
                className={`q-tab ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                All
              </button>
            </div>

            <div className="queue-list-scroll">
              {filteredApplets.length === 0 ? (
                <div className="queue-empty">No applets in this category.</div>
              ) : (
                filteredApplets.map(app => {
                  const isCur = selectedApplet?.id === app.id;
                  return (
                    <div
                      key={app.id}
                      className={`queue-item-card ${isCur ? 'active' : ''}`}
                      onClick={() => setSelectedApplet(app)}
                    >
                      <div className="queue-item-header">
                        <span className={`status-pill ${app.status}`}>{app.status}</span>
                        <span className="queue-date">
                          <Clock size={11} />
                          {new Date(app.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="queue-title">{app.title}</h4>
                      <div className="queue-author">by {app.author}</div>
                      <div className="queue-tags">
                        {app.tags.slice(0, 2).map(t => (
                          <span key={t}>#{t}</span>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right Column: Interactive Review & Simulator */}
          <main className="admin-detail-panel">
            {selectedApplet ? (
              <div className="review-sheet">
                {/* Header Action Bar */}
                <div className="review-header-bar">
                  <div>
                    <div className="review-meta-row">
                      <span className={`status-pill ${selectedApplet.status}`}>
                        {selectedApplet.status.toUpperCase()}
                      </span>
                      <span className="review-author-tag">Creator: {selectedApplet.author}</span>
                      <span className="review-id-tag">ID: {selectedApplet.id}</span>
                    </div>
                    <h2 className="review-app-title">{selectedApplet.title}</h2>
                    <p className="review-app-desc">{selectedApplet.description}</p>
                  </div>

                  {/* Approve / Reject Actions */}
                  <div className="review-action-btns">
                    <button
                      type="button"
                      className="btn-approve"
                      onClick={() => handleModerate(selectedApplet.id, 'approve')}
                      disabled={selectedApplet.status === 'approved'}
                    >
                      <CheckCircle size={16} />
                      <span>Approve to Store</span>
                    </button>
                    <button
                      type="button"
                      className="btn-reject"
                      onClick={() => handleModerate(selectedApplet.id, 'reject')}
                      disabled={selectedApplet.status === 'rejected'}
                    >
                      <XCircle size={16} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>

                {/* Split View: Live Simulator & Source Code */}
                <div className="review-body-split">
                  {/* Live Simulator Preview */}
                  <div className="review-sim-box">
                    <h3 className="section-label">Live Simulator Emulation</h3>
                    <OledSimulator
                      jsCode={selectedApplet.jsCompanion}
                      title={selectedApplet.title}
                      author={selectedApplet.author}
                    />
                  </div>

                  {/* Code Inspector */}
                  <div className="review-code-box">
                    <div className="code-tabs-header">
                      <button
                        type="button"
                        className={`code-tab ${activeCodeTab === 'js' ? 'active' : ''}`}
                        onClick={() => setActiveCodeTab('js')}
                      >
                        JS Companion (Simulator)
                      </button>
                      <button
                        type="button"
                        className={`code-tab ${activeCodeTab === 'cpp_h' ? 'active' : ''}`}
                        onClick={() => setActiveCodeTab('cpp_h')}
                      >
                        C++ Header (.h)
                      </button>
                      <button
                        type="button"
                        className={`code-tab ${activeCodeTab === 'cpp_source' ? 'active' : ''}`}
                        onClick={() => setActiveCodeTab('cpp_source')}
                      >
                        C++ Source (.cpp)
                      </button>
                    </div>

                    <div className="code-editor-preview">
                      <pre>
                        <code>
                          {activeCodeTab === 'js' && selectedApplet.jsCompanion}
                          {activeCodeTab === 'cpp_h' && selectedApplet.cppHeader}
                          {activeCodeTab === 'cpp_source' && selectedApplet.cppSource}
                        </code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-selection-view">
                <p>Select a submission from the queue to inspect and test in the simulator.</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
