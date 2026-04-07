// Mohammed Ayaan Khan
// 11375145
// yqp826

'use client';
import { useState, useEffect } from 'react';

export default function App() {
    // Controls for the application, navigations, searches, and modals.
    const [user, setUser] = useState(null);
    const [channels, setChannels] = useState([]);
    const [currentChannelId, setCurrentChannelId] = useState(null);
    const [currentPostId, setCurrentPostId] = useState(null);
    const [posts, setPosts] = useState([]);
    const [thread, setThread] = useState(null);
    const [users, setUsers] = useState([]);

    const [viewNode, setViewNode] = useState('home');
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [searchRes, setSearchRes] = useState(null);

    const [authData, setAuthData] = useState({ username: '', password: '', isAdmin: false });
    const [chanData, setChanData] = useState({ name: '', description: '' });
    const [postData, setPostData] = useState({ title: '', content: '', image: null });
    const [replyData, setReplyData] = useState({ content: '', image: null, parentId: null });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('substring');

    // Check the session and load channels.
    useEffect(() => {
        checkAuth();
        loadChannels();
    }, []);

    // Handle requests and errors
    const apiCall = async (endpoint, method = 'GET', body = null) => {
        const headers = body instanceof FormData ? {} : { 'Content-Type': 'application/json' };
        const reqBody = body instanceof FormData ? body : (body ? JSON.stringify(body) : null);
        const res = await fetch(endpoint, { method, headers, body: reqBody });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'API Error');
        return data;
    };

    // Authentication Handling.
    const checkAuth = async () => {
        try { const data = await apiCall('/api/me'); setUser(data.user); }
        catch (e) { setUser(null); }
    };

    // Loading the functions
    const loadChannels = async () => {
        try { const data = await apiCall('/api/channels'); setChannels(data); }
        catch (e) {}
    };

    const loadChannel = async (id) => {
        setLoading(true);
        setCurrentChannelId(id);
        setCurrentPostId(null);
        setViewNode('channel');
        try { const p = await apiCall(`/api/channels/${id}/posts`); setPosts(p); }
        catch (e) {}
        setLoading(false);
    };

    const loadThread = async (id) => {
        setLoading(true);
        setCurrentPostId(id);
        setViewNode('thread');
        try {
            const post = await apiCall(`/api/posts/${id}`);
            const replies = await apiCall(`/api/posts/${id}/replies`);
            setThread({ post, replies });
        } catch (e) {}
        setLoading(false);
    };

    // Dashboard
    const loadAdminPanel = async () => {
        setLoading(true);
        setViewNode('admin');
        try { const u = await apiCall('/api/users'); setUsers(u); }
        catch (e) {}
        setLoading(false);
    };

    // Search handling
    const doSearch = async () => {
        if (!searchQuery && ['substring', 'author'].includes(searchType)) {
            setViewNode('home'); return;
        }
        setLoading(true);
        setViewNode('search');
        try {
            const res = await apiCall(`/api/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}&page=1`);
            setSearchRes(res);
        } catch (e) {}
        setLoading(false);
    };

    // Logic for voting
    const doVote = async (type, id, val) => {
        if (!user) return setModal('login');
        try {
            await apiCall('/api/vote', 'POST', { item_type: type, item_id: id, vote_value: val });
            if (viewNode === 'channel') loadChannel(currentChannelId);
            if (viewNode === 'thread') loadThread(currentPostId);
            if (viewNode === 'search') doSearch();
        } catch (e) { alert(e.message); }
    };

    const logout = async () => {
        try { await apiCall('/api/logout', 'POST'); } catch (e) {}
        setUser(null);
        setViewNode('home');
    };

    // Post Submission handling
    const submitAuth = async (e) => {
        e.preventDefault();
        try {
            await apiCall(modal === 'login' ? '/api/login' : '/api/register', 'POST', authData);
            await checkAuth();
            setModal(null);
            setAuthData({ username: '', password: '', isAdmin: false });
            setErrorMsg('');
        } catch (e) { setErrorMsg(e.message); }
    };

    const submitChannel = async (e) => {
        e.preventDefault();
        try {
            await apiCall('/api/channels', 'POST', chanData);
            setModal(null);
            setChanData({ name: '', description: '' });
            loadChannels();
        } catch (e) { setErrorMsg(e.message); }
    };

    const submitPost = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('title', postData.title);
        fd.append('content', postData.content);
        if (postData.image) fd.append('image', postData.image);
        try {
            await apiCall(`/api/channels/${currentChannelId}/posts`, 'POST', fd);
            setModal(null);
            setPostData({ title: '', content: '', image: null });
            loadChannel(currentChannelId);
        } catch (e) { setErrorMsg(e.message); }
    };

    const submitReply = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('content', replyData.content);
        if (replyData.parentId) fd.append('parent_reply_id', replyData.parentId);
        if (replyData.image) fd.append('image', replyData.image);
        try {
            await apiCall(`/api/posts/${currentPostId}/replies`, 'POST', fd);
            setModal(null);
            setReplyData({ content: '', image: null, parentId: null });
            loadThread(currentPostId);
        } catch (e) { setErrorMsg(e.message); }
    };

    const openModal = (name) => { setModal(name); setErrorMsg(''); };

    // Utilities
    const buildReplyTree = (replies) => {
        if (!replies) return []; // shows as threaded replies
        const map = {};
        const roots = [];
        replies.forEach(r => { r.children = []; map[r.id] = r; });
        replies.forEach(r => {
            if (r.parent_reply_id && map[r.parent_reply_id]) map[r.parent_reply_id].children.push(r);
            else roots.push(r);
        });
        return roots;
    };

    const avatarChar = (name) => (name || '?')[0].toUpperCase();
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const fmtDateTime = (d) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const currentChannel = channels.find(c => c.id === currentChannelId);

    // Reply component
    const ReplyNode = ({ reply }) => (
        <div className={`reply-container ${reply.children.length === 0 ? 'no-children' : ''}`}>
            <div className="vote-controls" style={{ paddingTop: '0.3rem' }}>
                <button className="vote-btn up" onClick={() => doVote('reply', reply.id, 1)} title="Upvote">▲</button>
                <span className="score">{reply.score}</span>
                <button className="vote-btn down" onClick={() => doVote('reply', reply.id, -1)} title="Downvote">▼</button>
            </div>
            <div className="reply-content-box">
                {/* Reply header: author info, timestamp, and delete for admin */}
                <div className="post-header">
                    <div className="post-author">
                        <div className="author-avatar">{avatarChar(reply.username)}</div>
                        <strong style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{reply.username}</strong>
                        <span>· {fmtDateTime(reply.created_at)}</span>
                    </div>

                    {/* Delete button for admin */}
                    {user?.role === 'admin' && (
                        <button className="icon-btn danger" title="Delete reply" onClick={async () => {
                            if (confirm('Delete this reply?')) {
                                await apiCall(`/api/replies/${reply.id}`, 'DELETE');
                                loadThread(currentPostId);
                            }
                        }}>🗑</button>
                    )}
                </div>

                {/* Reply content and image*/}
                <p style={{ fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{reply.content}</p>
                {reply.image_url && (
                    <a href={reply.image_url} target="_blank" rel="noreferrer">
                        <img src={reply.image_url} alt="Attached" className="post-image" />
                    </a>
                )}

                {/* Reply button for logged in users */}    
                <div style={{ marginTop: '0.6rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {user && (
                        <span className="action-link" onClick={() => {
                            setReplyData({ content: '', image: null, parentId: reply.id });
                            openModal('reply');
                        }}>↩ Reply to {reply.username}</span>
                    )}
                </div>

                {/* Nested replies */}
                {reply.children.length > 0 && (
                    <div className="nested-replies">
                        {reply.children.map(c => <ReplyNode key={c.id} reply={c} />)}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="app-layout">
            {/* ── Top Navigation bar ── */}
            <header className="topbar">
                <div className="logo" onClick={() => { setViewNode('home'); setCurrentChannelId(null); setCurrentPostId(null); }}>
                    write/it
                </div>

                <div className="search-bar">
                    <label htmlFor="searchInput" className="sr-only">Search</label>
                    <input
                        id="searchInput"
                        type="text"
                        placeholder="Search any questions or replies.."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && doSearch()}
                    />
                    <button className="btn" onClick={doSearch}>Search</button> 
                </div>

                <div className="user-actions">
                    {user ? (
                        <>
                            {user.role === 'admin' && <span className="badge badge-admin">Admin</span>}
                            <div className="user-chip">
                                <div className="user-avatar">{avatarChar(user.username)}</div>
                                {user.username}
                            </div>
                            {user.role === 'admin' && (
                                <button className="btn" onClick={loadAdminPanel}>⚙ Panel</button>
                            )}
                            <button className="btn" onClick={logout}>Sign out</button>
                        </>
                    ) : (
                        <>
                            <button className="btn" onClick={() => openModal('login')}>Sign in</button>
                            <button className="primary-btn" onClick={() => openModal('register')}>Join free</button>
                        </>
                    )}
                </div>
            </header>

            {/* ── Main body ── */}
            <div className="layout-body">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="sidebar-header">
                        <span className="sidebar-title">Channels</span>
                        {user?.role === 'admin' && (
                            <button className="icon-btn" title="New channel" onClick={() => openModal('channel')}>＋</button>
                        )}
                    </div>
                    <ul className="channel-list">
                        {channels.map(c => (
                            <li
                                key={c.id}
                                className={`channel-item ${currentChannelId === c.id ? 'active' : ''}`}
                                onClick={() => loadChannel(c.id)}
                            >
                                <span className="chan-name">
                                    <span className="chan-hash">#</span>
                                    {c.name}
                                </span>

                                {/* Delete button for admin */}
                                {user?.role === 'admin' && (
                                    <button className="icon-btn danger" title="Delete channel" onClick={async (e) => {
                                        e.stopPropagation();
                                        if (confirm(`Delete #${c.name}?`)) {
                                            await apiCall(`/api/channels/${c.id}`, 'DELETE');
                                            loadChannels();
                                            if (currentChannelId === c.id) setViewNode('home');
                                        }
                                    }}>🗑</button>
                                )}
                            </li>
                        ))}
                    </ul>
                </aside>

                {/* Main content area */}
                <main className="main-content">
                    <div className="content-inner">
                        {loading ? (
                            <div className="loader">
                                <div className="loader-spinner" />
                                <p>Loading…</p>
                            </div>
                        ) : (
                            <>
                                {/* Home view */}
                                {viewNode === 'home' && (
                                    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                        <div className="home-hero">
                                            <h2>Welcome to Write/it</h2>
                                            <p>Ask questions, make comments, or just scroll through!!</p>
                                            <div className="home-stats">
                                                <div className="stat-pill">
                                                    <span>{channels.length}</span> channels
                                                </div>
                                                {!user && (
                                                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                                        <button className="primary-btn" onClick={() => openModal('register')}>Get started →</button>
                                                        <button className="btn" onClick={() => openModal('login')}>Sign in</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem', fontSize: '0.875rem' }}>
                                            ← Select a channel from the sidebar to start browsing
                                        </p>
                                    </div>
                                )}

                                {/* Channel view */}
                                {viewNode === 'channel' && (
                                    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
                                        <div className="view-header">
                                            <div>
                                                <h1># {currentChannel?.name}</h1>
                                                {currentChannel?.description && (
                                                    <p>{currentChannel.description}</p>
                                                )}
                                            </div>
                                            {user && (
                                                <button className="primary-btn" onClick={() => openModal('post')}>
                                                    + Ask Question
                                                </button>
                                            )}
                                        </div>
                                        <div className="post-list">
                                            {posts.length === 0 ? (
                                                <div className="empty-state">
                                                    <div className="empty-icon">💬</div>
                                                    <h3>No questions yet</h3>
                                                    <p>Be the first to ask something in this channel!</p>
                                                    {user && <button className="primary-btn" style={{ marginTop: '1rem' }} onClick={() => openModal('post')}>Ask a Question</button>}
                                                </div>
                                            ) : posts.map(p => (
                                                <div key={p.id} className="post-card" onClick={() => loadThread(p.id)}>
                                                    <div className="vote-controls" onClick={e => e.stopPropagation()}>
                                                        <button className="vote-btn up" onClick={() => doVote('post', p.id, 1)} title="Upvote">▲</button>
                                                        <span className="score">{p.score}</span>
                                                        <button className="vote-btn down" onClick={() => doVote('post', p.id, -1)} title="Downvote">▼</button>
                                                    </div>
                                                    <div className="post-content">
                                                        <div className="post-header">
                                                            <div className="post-author">
                                                                <div className="author-avatar">{avatarChar(p.username)}</div>
                                                                <strong style={{ fontWeight: 500 }}>{p.username}</strong>
                                                                <span>· {fmtDate(p.created_at)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="post-title">{p.title}</div>
                                                        <p className="post-excerpt">{p.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Thread view */}
                                {viewNode === 'thread' && thread?.post && (
                                    <div className="thread-view">
                                        <button className="btn" style={{ marginBottom: '1.25rem' }} onClick={() => loadChannel(thread.post.channel_id)}>
                                            ← Back to #{channels.find(c => c.id === thread.post.channel_id)?.name}
                                        </button>
                                        <div className="thread-original-post">
                                            <div className="post-header">
                                                <div className="post-author">
                                                    <div className="author-avatar">{avatarChar(thread.post.username)}</div>
                                                    <strong style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{thread.post.username}</strong>
                                                    <span>· {fmtDateTime(thread.post.created_at)}</span>
                                                </div>
                                                {user?.role === 'admin' && (
                                                    <button className="icon-btn danger" title="Delete post" onClick={async () => {
                                                        if (confirm('Delete this post?')) {
                                                            await apiCall(`/api/posts/${thread.post.id}`, 'DELETE');
                                                            loadChannel(thread.post.channel_id);
                                                        }
                                                    }}>🗑</button>
                                                )}
                                            </div>
                                            <h1 className="thread-title">{thread.post.title}</h1>
                                            <p className="thread-body">{thread.post.content}</p>
                                            {thread.post.image_url && (
                                                <a href={thread.post.image_url} target="_blank" rel="noreferrer">
                                                    <img src={thread.post.image_url} className="post-image" alt="Post attachment" />
                                                </a>
                                            )}
                                            <div className="thread-actions">
                                                <div className="vote-inline">
                                                    <button className="vote-btn up" onClick={() => doVote('post', thread.post.id, 1)} title="Upvote">▲</button>
                                                    <span className="score">{thread.post.score}</span>
                                                    <button className="vote-btn down" onClick={() => doVote('post', thread.post.id, -1)} title="Downvote">▼</button>
                                                </div>
                                                {user && (
                                                    <button className="primary-btn" onClick={() => {
                                                        setReplyData({ content: '', image: null, parentId: null });
                                                        openModal('reply');
                                                    }}>
                                                        ↩ Add Reply
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="replies-section">
                                            <div className="replies-header">
                                                Replies <span className="replies-count">{thread.replies.length}</span>
                                            </div>
                                            {thread.replies.length === 0 ? (
                                                <div className="empty-state">
                                                    <h3>No replies yet</h3>
                                                    <p>Be the first to share your knowledge!</p>
                                                </div>
                                            ) : buildReplyTree(thread.replies).map(root => (
                                                <ReplyNode key={root.id} reply={root} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Admin view */}
                                {viewNode === 'admin' && (
                                    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
                                        <div className="view-header">
                                            <h1>⚙ Admin Dashboard</h1>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            {users.map(u => (
                                                <div key={u.id} className="admin-user-card">
                                                    <div className="admin-user-info">
                                                        <div className="admin-user-avatar">{avatarChar(u.username)}</div>
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{u.username}</div>
                                                            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>Joined {fmtDate(u.created_at)}</div>
                                                        </div>
                                                        {u.role === 'admin' && <span className="badge badge-admin">admin</span>}
                                                    </div>
                                                    {u.id !== user?.id && (
                                                        <button className="danger-btn" onClick={async () => {
                                                            if (confirm(`Delete user "${u.username}"?`)) {
                                                                await apiCall(`/api/users/${u.id}`, 'DELETE');
                                                                loadAdminPanel();
                                                            }
                                                        }}>🗑 Delete</button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Search view */}
                                {viewNode === 'search' && searchRes && (
                                    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
                                        <div className="view-header">
                                            <h1>Search Results</h1>
                                        </div>
                                        <div className="post-list">
                                            {(searchRes.posts || []).map(p => (
                                                <div key={'p' + p.id} className="post-card" onClick={() => loadThread(p.id)}>
                                                    <div className="post-content">
                                                        <div className="post-header">
                                                            <div className="post-author">
                                                                <div className="author-avatar">{avatarChar(p.username)}</div>
                                                                <span>{p.username}</span>
                                                                <span style={{ color: 'var(--text-muted)' }}>· in #{p.channel_id}</span>
                                                            </div>
                                                        </div>
                                                        <div className="post-title">{p.title}</div>
                                                        <p className="post-excerpt">{p.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {(searchRes.replies || []).map(r => (
                                                <div key={'r' + r.id} className="post-card" onClick={() => loadThread(r.post_id)}>
                                                    <div className="post-content">
                                                        <div className="post-header">
                                                            <span style={{ color: 'var(--accent-2)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reply</span>
                                                        </div>
                                                        <div className="post-author" style={{ marginBottom: '0.3rem' }}>
                                                            <div className="author-avatar">{avatarChar(r.username)}</div>
                                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.username}</span>
                                                        </div>
                                                        <p className="post-excerpt">{r.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {(searchRes.users || []).map(u => (
                                                <div key={'u' + u.id} className="admin-user-card" style={{ cursor: 'default' }}>
                                                    <div className="admin-user-info">
                                                        <div className="admin-user-avatar">{avatarChar(u.username)}</div>
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{u.username}</div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                {u.metric_label || 'Posts'}: <strong style={{ color: 'var(--accent-2)' }}>{u.metric_value ?? u.post_count}</strong>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {!searchRes.posts?.length && !searchRes.replies?.length && !searchRes.users?.length && (
                                                <div className="empty-state">
                                                    <div className="empty-icon">🔍</div>
                                                    <h3>No results found</h3>
                                                    <p>Try a different search term or type</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>
            </div>

            {/* ── Modals ── */}
            {modal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2>
                                {modal === 'login' && '👋 Welcome back'}
                                {modal === 'register' && '🚀 Create account'}
                                {modal === 'channel' && '# New Channel'}
                                {modal === 'post' && '❓ Ask a Question'}
                                {modal === 'reply' && '↩ Post a Reply'}
                            </h2>
                            <button className="close-modal-btn" onClick={() => setModal(null)}>×</button>
                        </div>

                        {(modal === 'login' || modal === 'register') && (
                            <form onSubmit={submitAuth}>
                                <label className="sr-only" htmlFor="auth-username">Username</label>
                                <input
                                    id="auth-username"
                                    type="text"
                                    placeholder="Username"
                                    required
                                    autoFocus
                                    value={authData.username}
                                    onChange={e => setAuthData({ ...authData, username: e.target.value })}
                                />
                                <label className="sr-only" htmlFor="auth-password">Password</label>
                                <input
                                    id="auth-password"
                                    type="password"
                                    placeholder="Password"
                                    required
                                    value={authData.password}
                                    onChange={e => setAuthData({ ...authData, password: e.target.value })}
                                />
                                {modal === 'register' && (
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={authData.isAdmin}
                                            onChange={e => setAuthData({ ...authData, isAdmin: e.target.checked })}
                                        />
                                        Register as Administrator
                                    </label>
                                )}
                                <button className="primary-btn" type="submit" style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}>
                                    {modal === 'login' ? 'Sign In' : 'Create Account'}
                                </button>
                                {errorMsg && <p className="error-msg">⚠ {errorMsg}</p>}
                            </form>
                        )}

                        {modal === 'channel' && (
                            <form onSubmit={submitChannel}>
                                <input
                                    type="text"
                                    placeholder="Channel name (e.g. javascript)"
                                    required
                                    autoFocus
                                    value={chanData.name}
                                    onChange={e => setChanData({ ...chanData, name: e.target.value })}
                                />
                                <textarea
                                    placeholder="Short description (optional)"
                                    value={chanData.description}
                                    onChange={e => setChanData({ ...chanData, description: e.target.value })}
                                />
                                <button className="primary-btn" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
                                    Create Channel
                                </button>
                                {errorMsg && <p className="error-msg">⚠ {errorMsg}</p>}
                            </form>
                        )}

                        {modal === 'post' && (
                            <form onSubmit={submitPost}>
                                <input
                                    type="text"
                                    placeholder="What's your question?"
                                    required
                                    autoFocus
                                    value={postData.title}
                                    onChange={e => setPostData({ ...postData, title: e.target.value })}
                                />
                                <textarea
                                    placeholder="Describe your problem in detail…"
                                    required
                                    style={{ minHeight: '140px' }}
                                    value={postData.content}
                                    onChange={e => setPostData({ ...postData, content: e.target.value })}
                                />
                                <label className="file-upload-label">
                                    <span>📎 Attach an image (optional)</span>
                                    <div className="file-upload-area" onClick={() => document.getElementById('post-image-input').click()}>
                                        <input
                                            id="post-image-input"
                                            type="file"
                                            accept="image/*"
                                            onChange={e => setPostData({ ...postData, image: e.target.files[0] })}
                                        />
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            {postData.image ? `✓ ${postData.image.name}` : 'Click to upload PNG, JPG or WEBP (max 5MB)'}
                                        </span>
                                    </div>
                                </label>
                                <button className="primary-btn" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
                                    Post Question
                                </button>
                                {errorMsg && <p className="error-msg">⚠ {errorMsg}</p>}
                            </form>
                        )}

                        {modal === 'reply' && (
                            <form onSubmit={submitReply}>
                                {replyData.parentId && (
                                    <div style={{ background: 'var(--bg-dark)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)', borderLeft: '3px solid var(--accent)' }}>
                                        Replying to a comment
                                    </div>
                                )}
                                <textarea
                                    placeholder="Write your reply…"
                                    required
                                    autoFocus
                                    style={{ minHeight: '120px' }}
                                    value={replyData.content}
                                    onChange={e => setReplyData({ ...replyData, content: e.target.value })}
                                />
                                <label className="file-upload-label">
                                    <span>📎 Attach an image (optional)</span>
                                    <div className="file-upload-area" onClick={() => document.getElementById('reply-image-input').click()}>
                                        <input
                                            id="reply-image-input"
                                            type="file"
                                            accept="image/*"
                                            onChange={e => setReplyData({ ...replyData, image: e.target.files[0] })}
                                        />
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            {replyData.image ? `✓ ${replyData.image.name}` : 'Click to upload PNG, JPG or WEBP (max 5MB)'}
                                        </span>
                                    </div>
                                </label>
                                <button className="primary-btn" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
                                    Post Reply
                                </button>
                                {errorMsg && <p className="error-msg">⚠ {errorMsg}</p>}
                            </form>
                        )}
                    </div>
                </div>
            )}
            {/* ── Footer ── */}
            <footer style={{
                textAlign: 'center',
                padding: '0.6rem',
                fontSize: '0.65rem',
                letterSpacing: '0.12em',
                color: 'var(--text-muted)',
                opacity: 0.5,
                borderTop: '1px solid var(--border)',
                userSelect: 'none',
            }}>
                CMPT353-PROJECT
            </footer>
        </div>
    );
}
