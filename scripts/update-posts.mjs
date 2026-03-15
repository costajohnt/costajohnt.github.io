import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HASHNODE_API = 'https://gql.hashnode.com';
const HOST = 'blog.jcosta.tech';

const query = `
  query GetRecentPosts($host: String!) {
    publication(host: $host) {
      posts(first: 20) {
        edges {
          node {
            title
            subtitle
            slug
            publishedAt
            readTimeInMinutes
            url
            coverImage { url }
          }
        }
      }
    }
  }
`;

async function fetchPosts() {
  const response = await fetch(HASHNODE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { host: HOST },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  const edges = json?.data?.publication?.posts?.edges;
  if (!edges) {
    throw new Error('Unexpected response shape: missing publication.posts.edges');
  }

  return edges.map(({ node }) => ({
    title: node.title,
    subtitle: node.subtitle ?? '',
    date: node.publishedAt.slice(0, 10),
    readTime: `${node.readTimeInMinutes} min`,
    url: node.url,
    coverImage: node.coverImage?.url ?? '',
  }));
}

async function main() {
  const posts = await fetchPosts();

  const outputPath = join(__dirname, '..', 'data', 'posts.json');
  writeFileSync(outputPath, JSON.stringify({ posts }, null, 2) + '\n');
  console.log(`Wrote ${posts.length} posts to ${outputPath}`);
}

main().catch((err) => {
  console.error('Failed to update posts:', err);
  process.exit(1);
});
