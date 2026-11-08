// Push state for publish-post.mjs, decided from git refs rather than from
// whether this run staged anything: a re-run after a failed push has a clean
// index but still holds the unpushed post commit.
// `git(args)` runs git and returns stdout, throwing on a non-zero exit.

export function commitsAhead(git) {
  return Number(git(['rev-list', '--count', '@{u}..HEAD']).trim());
}

// null when the post is on the remote; otherwise why cross-posting must wait.
export function unpushedReason(git, slug) {
  let ahead;
  try {
    ahead = commitsAhead(git);
  } catch {
    return 'the current branch has no upstream to compare against';
  }
  if (ahead > 0) return `${ahead} local commit(s) are not on the remote`;
  try {
    git(['cat-file', '-e', `@{u}:writing/${slug}/index.html`]);
  } catch {
    return `writing/${slug}/index.html is not on the remote`;
  }
  return null;
}
