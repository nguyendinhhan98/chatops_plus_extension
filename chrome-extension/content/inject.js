/**
 * Mattermost Main World React Fiber Bridge — ChatOps Chrome Extension
 *
 * Runs in the MAIN world to read React internals (Fiber props + Redux store)
 * and resolve the exact login username for any post element.
 */
(function () {
  /* ── Redux store lookup ─────────────────────────────────────────── */
  let _store = null;

  function findReduxStore() {
    try {
      const rootEl = document.getElementById('root');
      if (!rootEl) return null;
      const key = Object.keys(rootEl).find(
        k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
      );
      if (!key) return null;

      // Walk DOWN from the root fiber to find the Redux <Provider store={store}>
      const queue = [rootEl[key]];
      let depth = 0;
      while (queue.length && depth < 200) {
        const fiber = queue.shift();
        if (!fiber) continue;
        depth++;

        const p = fiber.memoizedProps;
        if (p && p.store && typeof p.store.getState === 'function') {
          return p.store;
        }
        if (fiber.stateNode && fiber.stateNode.store &&
            typeof fiber.stateNode.store.getState === 'function') {
          return fiber.stateNode.store;
        }

        if (fiber.child) queue.push(fiber.child);
        if (fiber.sibling) queue.push(fiber.sibling);
      }
    } catch (_) { /* silent */ }
    return null;
  }

  function getStore() {
    if (!_store) _store = findReduxStore();
    return _store;
  }

  function usernameFromStore(userId) {
    try {
      const store = getStore();
      if (!store) return null;
      const state = store.getState();
      const profile = state?.entities?.users?.profiles?.[userId];
      if (profile && profile.username) return profile.username;
    } catch (_) { /* silent */ }
    return null;
  }

  /* ── Fiber inspection ───────────────────────────────────────────── */

  function getPostInfo(el) {
    if (!el) return { username: null, userId: null };
    const fiberKey = Object.keys(el).find(
      k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
    );
    if (!fiberKey) return { username: null, userId: null };

    let userId = null;
    let username = null;

    // Walk UP through the fiber tree starting from the DOM element.
    // STOP as soon as we find the first `props.post` — that belongs to
    // THIS post, not the parent thread post.
    let fiber = el[fiberKey];
    let depth = 0;
    while (fiber && depth < 40) {
      const props = fiber.memoizedProps;
      if (props) {
        // 1. post object — always has user_id for the message author
        if (props.post && typeof props.post === 'object' && props.post.user_id) {
          userId = props.post.user_id;
          // Webhook / bot posts carry username directly
          if (props.post.username) username = props.post.username;
          if (!username && props.post.props && props.post.props.override_username) {
            username = props.post.props.override_username;
          }
          break; // ← critical: stop here so we don't climb into the parent post
        }

        // 2. Direct user-like objects
        for (const k of ['user', 'sender', 'profile', 'author', 'member', 'creator']) {
          const obj = props[k];
          if (obj && typeof obj === 'object' && obj.username) {
            username = obj.username;
            if (obj.id) userId = obj.id;
            break;
          }
        }
        if (username) break;

        // 3. Plain username string
        if (typeof props.username === 'string' && props.username &&
            !props.username.includes(' ')) {
          username = props.username;
          break;
        }
      }

      fiber = fiber.return;
      depth++;
    }

    // Resolve userId → username via Redux store if we only have userId
    if (userId && !username) {
      username = usernameFromStore(userId);
    }

    return { username: username || null, userId: userId || null };
  }

  /* ── Event bridge ───────────────────────────────────────────────── */

  window.addEventListener('chatops-username-request', (e) => {
    const postId = e.detail.postId;
    const el =
      document.getElementById('post_' + postId) ||
      document.getElementById('rhsPost_' + postId);

    const info = el ? getPostInfo(el) : { username: null, userId: null };

    window.dispatchEvent(new CustomEvent('chatops-username-response', {
      detail: { postId, username: info.username, userId: info.userId }
    }));
  });

  window.addEventListener('chatops-post-message-request', (e) => {
    const postId = e.detail.postId;
    const el =
      document.getElementById('post_' + postId) ||
      document.getElementById('rhsPost_' + postId);

    let message = null;
    if (el) {
      const fiberKey = Object.keys(el).find(
        k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
      );
      if (fiberKey) {
        let fiber = el[fiberKey];
        let depth = 0;
        while (fiber && depth < 40) {
          const props = fiber.memoizedProps;
          if (props && props.post && typeof props.post === 'object') {
            message = props.post.message || null;
            break;
          }
          fiber = fiber.return;
          depth++;
        }
      }
    }

    window.dispatchEvent(new CustomEvent('chatops-post-message-response', {
      detail: { postId, message }
    }));
  });

  function findChannelIdFromDom() {
    try {
      const textbox = document.getElementById('post_textbox') || document.getElementById('reply_textbox');
      if (!textbox) return null;
      const key = Object.keys(textbox).find(
        k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
      );
      if (!key) return null;
      
      let fiber = textbox[key];
      let depth = 0;
      while (fiber && depth < 50) {
        const props = fiber.memoizedProps;
        if (props) {
          if (props.channelId) return props.channelId;
          if (props.channel && props.channel.id) return props.channel.id;
          if (props.postId && props.channelId) return props.channelId;
        }
        fiber = fiber.return;
        depth++;
      }
    } catch (_) {}
    return null;
  }

  window.addEventListener('chatops-current-channel-request', () => {
    let channelId = null;
    try {
      const store = getStore();
      if (store) {
        const state = store.getState();
        channelId = state?.entities?.channels?.currentChannelId || null;
      }
    } catch (_) {}

    if (!channelId) {
      channelId = findChannelIdFromDom();
    }

    window.dispatchEvent(new CustomEvent('chatops-current-channel-response', {
      detail: { channelId }
    }));
  });
})();
