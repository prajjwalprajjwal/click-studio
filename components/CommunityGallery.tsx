'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Heart,
  Play,
  Upload,
  Code2,
  Sparkles,
  CheckCircle,
  Tag,
  User,
  Plus
} from 'lucide-react';
import { AppletRecord } from '@/lib/db';

interface CommunityGalleryProps {
  onSelectApplet: (applet: AppletRecord) => void;
  selectedAppletId?: string;
}

export default function CommunityGallery({
  onSelectApplet,
  selectedAppletId
}: CommunityGalleryProps) {
  const [applets, setApplets] = useState<AppletRecord[]>([]);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Submission Form State
  const [subTitle, setSubTitle] = useState('');
  const [subAuthor, setSubAuthor] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subTags, setSubTags] = useState('game, arcade');
  const [subJs, setSubJs] = useState('');
  const [subCppHeader, setSubCppHeader] = useState('');
  const [subCppSource, setSubCppSource] = useState('');
  const [subInstructions, setSubInstructions] = useState('Tap ACTION to play.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchApplets = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/applets', window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (activeTag !== 'all') url.searchParams.set('tag', activeTag);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setApplets(data.applets);
      }
    } catch (e) {
      console.error('Failed to load gallery:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplets();
  }, [search, activeTag]);

  const handleLike = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/applets/${id}/like`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setApplets(prev =>
          prev.map(a => (a.id === id ? { ...a, likes: data.likes } : a))
        );
      }
    } catch (e) {
      console.error('Failed to like applet:', e);
    }
  };

  const handleSubmitApplet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const tagsArray = subTags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch('/api/applets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: subTitle,
          author: subAuthor,
          description: subDesc,
          tags: tagsArray,
          jsCompanion: subJs,
          cppHeader: subCppHeader,
          cppSource: subCppSource,
          instructions: subInstructions
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Submission failed');
      }

      setSubmitSuccess('Applet submitted! It is now pending moderation by Click Studio admins.');
      setTimeout(() => {
        setShowSubmitModal(false);
        setSubmitSuccess(null);
        // Reset form
        setSubTitle('');
        setSubAuthor('');
        setSubDesc('');
        setSubJs('');
        setSubCppHeader('');
        setSubCppSource('');
      }, 2500);
    } catch (err: any) {
      setSubmitError(err.message || 'Submission error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allTags = ['all', 'game', 'arcade', 'retro', 'productivity', 'challenge', 'focus'];

  return (
    <div className="gallery-section">
      <div className="gallery-header-row">
        <div>
          <div className="gallery-badge">
            <Sparkles size={13} className="text-cyan" />
            <span>COMMUNITY ECOSYSTEM</span>
          </div>
          <h2 className="gallery-title">Community Applet Store</h2>
          <p className="gallery-subtitle">
            Browse verified microapplets created by the Click maker community. Test them in the simulator or flash them directly.
          </p>
        </div>

        <button
          type="button"
          className="btn-submit-applet"
          onClick={() => setShowSubmitModal(true)}
        >
          <Plus size={16} />
          <span>Submit Your Applet</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="gallery-controls-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="gallery-search-input"
            placeholder="Search microapplets by title, author, or gameplay..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="tags-filter-list">
          {allTags.map(tag => (
            <button
              key={tag}
              type="button"
              className={`tag-filter-chip ${activeTag === tag ? 'active' : ''}`}
              onClick={() => setActiveTag(tag)}
            >
              {tag === 'all' ? 'All Applets' : `#${tag}`}
            </button>
          ))}
        </div>
      </div>

      {/* Applets Grid */}
      {isLoading ? (
        <div className="gallery-loading-state">
          <div className="spinner-cyan"></div>
          <span>Loading community store...</span>
        </div>
      ) : applets.length === 0 ? (
        <div className="gallery-empty-state">
          <p>No applets found matching your search. Be the first to build one!</p>
        </div>
      ) : (
        <div className="applet-cards-grid">
          {applets.map(app => {
            const isSelected = selectedAppletId === app.id;
            return (
              <div
                key={app.id}
                className={`applet-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectApplet(app)}
              >
                <div className="card-top-row">
                  <span className="card-author">
                    <User size={12} /> {app.author}
                  </span>
                  <button
                    type="button"
                    className="card-like-btn"
                    onClick={e => handleLike(e, app.id)}
                    title="Like this microapplet"
                  >
                    <Heart size={14} className={app.likes > 0 ? 'fill-red' : ''} />
                    <span>{app.likes}</span>
                  </button>
                </div>

                <h3 className="card-title">{app.title}</h3>
                <p className="card-description">{app.description}</p>

                <div className="card-tags-row">
                  {app.tags.slice(0, 3).map(t => (
                    <span key={t} className="card-tag">#{t}</span>
                  ))}
                </div>

                <div className="card-footer-action">
                  <div className="action-play-pill">
                    <Play size={13} />
                    <span>{isSelected ? 'Loaded in Simulator' : 'Test in Simulator'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Applet Modal */}
      {showSubmitModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Submit Microapplet to Click Store</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowSubmitModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitApplet} className="modal-form">
              <p className="modal-info-note">
                Submitted applets are placed into the <strong>Admin Moderation Pipeline</strong> and will become public once approved.
              </p>

              {submitSuccess && (
                <div className="alert-success-box">
                  <CheckCircle size={16} />
                  <span>{submitSuccess}</span>
                </div>
              )}

              {submitError && (
                <div className="alert-error-box">
                  <span>{submitError}</span>
                </div>
              )}

              <div className="form-row-2col">
                <div className="form-group">
                  <label>Applet Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pixel Dungeon"
                    value={subTitle}
                    onChange={e => setSubTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Author / Handle *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MakerDev"
                    value={subAuthor}
                    onChange={e => setSubAuthor(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Short description of the gameplay and mechanics..."
                  value={subDesc}
                  onChange={e => setSubDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="game, arcade, retro"
                  value={subTags}
                  onChange={e => setSubTags(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>JavaScript Companion Code (Simulator) *</label>
                <textarea
                  required
                  rows={6}
                  className="font-mono text-sm"
                  placeholder="class Microapplet { constructor() { ... } }"
                  value={subJs}
                  onChange={e => setSubJs(e.target.value)}
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label>C++ Header (.h)</label>
                  <textarea
                    rows={4}
                    className="font-mono text-sm"
                    placeholder="#pragma once&#10;#include &quot;Applet.h&quot;"
                    value={subCppHeader}
                    onChange={e => setSubCppHeader(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>C++ Source (.cpp)</label>
                  <textarea
                    rows={4}
                    className="font-mono text-sm"
                    placeholder="#include &quot;MyApplet.h&quot;"
                    value={subCppSource}
                    onChange={e => setSubCppSource(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowSubmitModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit-action"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit for Moderation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
