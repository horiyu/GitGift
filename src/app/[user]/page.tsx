'use client'

import { useRouter } from 'next/navigation'; // ファイルの先頭でimport文を修正
import { useEffect, useState } from 'react';
import { Octokit } from "@octokit/rest";
import { useSession, signOut } from 'next-auth/react';
import OutlinedButton from '@/components/Button/Outlined';
import Link from 'next/link';
import styles from './user.module.css';

const octokit = new Octokit({
  auth: process.env.NEXT_PUBLIC_GITHUB_TOKEN,
});

const forkRepository = async (repoOwner: string, repoName: string) => {
  try {
    // Use the octokit instance to create a fork of the specified repository
    const response = await octokit.request('POST /repos/horiyu/GitGiftBOX-Fork/forks', {
      owner: repoOwner,
      repo: repoName,
      name: repoName,
      default_branch_only: true,
    });
  } catch (error) {
    console.error("Failed to fork the repository", error);
  }
};

export default function UserPage({
  params
}: {
  params: { user: string }
}) {
  const router = useRouter();
  const [user, setUser] = useState<null | any>(null); // useStateの型を指定
  const [followers, setFollowers] = useState<null | any[]>(null); // useStateの型を指定
  const [repos, setRepos] = useState<null | any[]>(null); // useStateの型を指定

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await octokit.rest.users.getByUsername({
          username: params.user
        });
        setUser(userData.data);

        const followersData = await octokit.rest.users.listFollowersForUser({
          username: params.user
        });
        setFollowers(followersData.data);

        const reposData = await octokit.rest.repos.listForUser({
          username: params.user
        });
        setRepos(reposData.data);
      } catch (error) {
        router.push('/404');
      }
    };

    fetchData();
  }, [params.user]);

  const session = useSession();
  const isThisMe: boolean = !!user?.id && !!session?.data?.user?.image && user.id.toString() === session?.data?.user?.image.match(/\/u\/(\d+)\?/)?.[1];
  const hasGitGiftBox = repos ? repos.some(repo => repo.name === 'GitGiftBOX') : false;

  return (
    <div className={styles.main}>
      {user && (
        <>
          <div className={styles.profile}>
            <Link href={user.html_url}>
              <img className={styles.icon} src={user.avatar_url} alt={user.login} style={{ width: "150px", height: "150px" }} />
              <h1>{user.name}</h1>
            </Link>
          </div>
          {hasGitGiftBox ?
            repos!.map(repo => repo.name === 'GitGiftBOX' ?
              <li key={repo.id}>{repo.name}</li> :
              null) :
            <p><b>{isThisMe ? "You" : user.name}</b> might not have the GitGiftBOX...</p>
          }
          {!hasGitGiftBox && isThisMe ?
            <OutlinedButton className={styles.getGGB} onClick={() => forkRepository(user.name, 'GitGiftBOX')}>GET GitGiftBOX</OutlinedButton> :
            null}
          <br />

          {isThisMe ?
            <OutlinedButton onClick={() => signOut()}>Sign Out</OutlinedButton> :
            null
          }
        </>
      )}
    </div>
  );
}