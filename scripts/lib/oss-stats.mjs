/**
 * Derive the displayed OSS stats (data/oss-stats.json shape) from the
 * merged-PR list. Extracted from update-oss-stats.mjs for testability.
 */

import { formatStars } from './format.mjs';

// The public rule, shared by jcosta.tech and the GitHub profile README
// (which reads jcosta.tech/data/oss-stats.json instead of recounting).
export const MIN_STARS = 100;

/** GraphQL search nodes -> merged-prs.json rows that meet the rule, newest first. */
export function qualifyingPRs(nodes) {
  return nodes
    .filter((n) => n.mergedAt && (n.repository?.stargazerCount ?? 0) >= MIN_STARS)
    .map((n) => ({
      url: n.url,
      title: n.title,
      mergedAt: n.mergedAt,
      repo: n.repository.nameWithOwner,
      number: n.number,
      stars: n.repository.stargazerCount,
      language: n.repository.primaryLanguage?.name ?? '',
    }))
    .sort((a, b) => new Date(b.mergedAt) - new Date(a.mergedAt));
}

export function deriveOssStats(prs) {
  // Group by repo
  const repoMap = new Map();
  const languages = new Set();

  for (const pr of prs) {
    const entry = repoMap.get(pr.repo) ?? { count: 0, stars: pr.stars, language: pr.language, url: `https://github.com/${pr.repo}` };
    entry.count += 1;
    // Keep the highest cached star count seen across the repo's PRs
    // (refreshDisplayedRepoStars later overwrites displayed repos with live values)
    if (pr.stars > entry.stars) entry.stars = pr.stars;
    repoMap.set(pr.repo, entry);
    if (pr.language) languages.add(pr.language);
  }

  // Sort repos by composite score: stars * sqrt(prCount)
  const sortedRepos = Array.from(repoMap.entries())
    .sort((a, b) => {
      const scoreA = a[1].stars * Math.sqrt(a[1].count || 1);
      const scoreB = b[1].stars * Math.sqrt(b[1].count || 1);
      return scoreB - scoreA;
    });

  const mapContribution = ([repo, data]) => {
    const displayName = data.stars >= 5000 ? repo : repo.split('/')[1];
    const entry = { repo: displayName, url: data.url, stars: formatStars(data.stars) };
    if (data.count >= 2) entry.prs = data.count;
    return entry;
  };

  const allContributions = sortedRepos.map(mapContribution);
  const contributions = allContributions.slice(0, 8);

  return {
    stats: {
      prsMerged: prs.length,
      repos: `${repoMap.size}+`,
      languages: languages.size,
    },
    contributions,
    allContributions,
  };
}
