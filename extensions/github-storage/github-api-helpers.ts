import { BaseError } from '@bangle.io/utils';

import { GITHUB_API_ERROR, INVALID_GITHUB_RESPONSE } from './errors';

export interface GithubTokenConfig {
  githubToken: string;
}

export interface GithubConfig extends GithubTokenConfig {
  owner: string;
  branch: string;
  repoName: string;
}

const RATELIMIT_STRING = `
rateLimit {
  limit
  cost
  remaining
  resetAt
}`;

function makeV3Api<T = any>({
  path,
  token,
  abortSignal,
  headers,
  isBlob,
}: {
  isBlob?: boolean;
  path: string;
  abortSignal?: AbortSignal;
  token: string;
  headers?: { [r: string]: string };
}): Promise<T> {
  const url = path.includes('https://')
    ? path
    : `https://api.github.com${path}`;
  return fetch(url, {
    method: 'GET',
    signal: abortSignal,
    headers: {
      Authorization: `token ${token}`,
      ...(headers || {}),
    },
  }).then((res) => {
    if (!res.ok) {
      return res.json().then((r) => {
        throw new BaseError({ message: r.message, code: GITHUB_API_ERROR });
      });
    }
    return isBlob ? res.blob() : res.json();
  });
}

function makeGraphql({
  query,
  variables,
  token,
}: {
  query: string;
  variables: { [r: string]: any };
  token: string;
}): Promise<any> {
  return fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `bearer ${token}`,
    },
    body: JSON.stringify({
      query: query,
      variables: variables,
    }),
  })
    .then((r) => {
      if (r.ok) {
        return r.json();
      }
      throw new BaseError({
        message: 'Github responded with an invalid status code',
        code: GITHUB_API_ERROR,
      });
    })
    .then((r) => {
      if (r.errors && r.errors.length > 0) {
        console.log('Github Graphql API error', r.errors[0]);
        throw new BaseError({
          message: r.errors[0].message,
          code: GITHUB_API_ERROR,
        });
      }
      return r.data;
    });
}

export type RepositoryInfo = {
  name: string;
  owner: string;
  branch: string;
  description: string;
};

export async function getBranchHead({ config }: { config: GithubConfig }) {
  const query = `query ($repoName: String!, $branchName: String!, $owner: String!) {
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
    repository(name: $repoName, owner: $owner) {
      description
      ref(qualifiedName: $branchName) {
        name
        prefix
        target {
          oid
        }
      }
    }
  }`;

  const result = await makeGraphql({
    query,
    variables: {
      repoName: config.repoName,
      branchName: config.branch,
      owner: config.owner,
    },
    token: config.githubToken,
  });

  const oid = result?.repository?.ref?.target?.oid;
  if (typeof oid === 'string') {
    return oid;
  }
  throw new BaseError({
    message: `Could not get branch head of ${config.repoName}.`,
    code: INVALID_GITHUB_RESPONSE,
  });
}

export async function* getRepos({
  token,
}: {
  token: GithubTokenConfig['githubToken'];
}): AsyncIterable<RepositoryInfo[]> {
  const query = `
    query ($after: String) {
      ${RATELIMIT_STRING}
      viewer {
        repositories(first: 50, after: $after) {
          pageInfo {
            endCursor
            hasNextPage
          }
          edges {
            node {
              name
              defaultBranchRef {
                name
                target {
                  oid
                }
              }
              nameWithOwner
              description
            }
          }
        }
      }
    }`;
  let hasNextPage;

  let endCursor = undefined;
  let calls = 0;
  let result: RepositoryInfo[] = [];
  do {
    let data: any = await makeGraphql({
      query,
      variables: { after: endCursor },
      token,
    });
    if (calls++ > 20) {
      break;
    }

    if (!Array.isArray(data.viewer.repositories?.edges)) {
      yield result;
      break;
    }

    ({ hasNextPage, endCursor } = data.viewer.repositories.pageInfo);

    result = result.concat(
      data.viewer.repositories.edges
        .map((r: any): RepositoryInfo => {
          return {
            name: r.node?.name,
            owner: r.node?.nameWithOwner?.split('/')[0],
            branch: r.node?.defaultBranchRef?.name,
            description: r.node?.description || '',
          };
        })
        .filter((r: RepositoryInfo) => {
          return r.name && r.owner && r.branch;
        }),
    );
    yield result;
  } while (hasNextPage);
}

export async function getAllFiles({
  abortSignal,
  config,
  treeSha,
}: {
  abortSignal: AbortSignal;
  config: GithubConfig;
  treeSha: string;
}): Promise<Array<{ path: string; url: string }>> {
  try {
    const { truncated, tree } = await makeV3Api({
      path: `/repos/${config.owner}/${
        config.repoName
      }/git/trees/${treeSha}?recursive=1&cacheBust=${Date.now()}`,
      token: config.githubToken,
      abortSignal,
    });

    if (truncated || !tree) {
      throw new BaseError({
        message: 'Github response is truncated',
        code: INVALID_GITHUB_RESPONSE,
      });
    }

    return (tree as any[]).map((t: any): { path: string; url: string } => ({
      path: t.path,
      url: t.url,
    }));
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return [];
      }
    }
    throw error;
  }
}

export async function pushChanges({
  headSha,
  commitMessage,
  additions,
  deletions,
  config,
}: {
  headSha: string;
  commitMessage: {
    headline: string;
    body?: string;
  };
  additions: Array<{ path: string; base64Content: string }>;
  deletions: Array<{ path: string }>;
  config: GithubConfig;
}): Promise<Array<[string, string]>> {
  let query = `
    mutation ($input: CreateCommitOnBranchInput!) {
      createCommitOnBranch(input: $input) {
        commit {
          url
          oid
        }
      }
    }
  `;
  const result = await makeGraphql({
    query,
    variables: {
      input: {
        expectedHeadOid: headSha,
        branch: {
          branchName: config.branch,
          repositoryNameWithOwner: `${config.owner}/${config.repoName}`,
        },
        message: commitMessage,
        fileChanges: {
          additions: additions.map((r) => ({
            path: r.path,
            contents: r.base64Content,
          })),
          deletions: deletions,
        },
      },
    },
    token: config.githubToken,
  });

  const commitHash = result.createCommitOnBranch?.commit?.oid;

  const result2 = await makeV3Api({
    path: `/repos/${config.owner}/${config.repoName}/commits/${commitHash}`,
    token: config.githubToken,
  });

  return result2.files.map((r: any) => {
    const blobUrl = r.blob_url.split('/');
    const blob = blobUrl[blobUrl.indexOf('blob') + 1];
    if (typeof blob !== 'string' || blob.length !== 40) {
      throw new BaseError({
        message: 'Invalid github blob returned',
        code: INVALID_GITHUB_RESPONSE,
      });
    }
    return [r.filename, r.contents_url];
  });
}

export async function getFileBlob({
  fileBlobUrl,
  config,
  fileName,
}: {
  fileName: string;
  fileBlobUrl: string;
  config: GithubConfig;
}) {
  return makeV3Api({
    isBlob: true,
    path: fileBlobUrl,
    token: config.githubToken,
    headers: {
      Accept: 'application/vnd.github.v3.raw+json',
    },
  }).then((r) => {
    return new File([r], fileName);
  });
}
