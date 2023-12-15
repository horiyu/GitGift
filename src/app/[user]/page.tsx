'use client'

import { useRouter } from 'next/navigation'; // ファイルの先頭でimport文を修正
import { useEffect, useState } from 'react';
import { Octokit } from "@octokit/rest";
import { useSession, signOut } from 'next-auth/react';
import OutlinedButton from '@/components/Button/Outlined';
import styles from './user.module.css';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // テンプレート文字列を削除
});

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

  return (
    <div>
      {user && (
        <>
          <img className={styles.icon} src={user.avatar_url} alt={user.login} style={{ width: "100px", height: "100px" }} />
          <h1>{user.name}</h1>
          <p>Followers: {followers ? followers.length : 'Loading...'}</p>
          {repos ? repos.some(repo => repo.name === 'GitGiftBOX') ? repos.map(repo => repo.name === 'GitGiftBOX' ? <li key={repo.id}>{repo.name}</li> : null) : `${user.name} might not have the GitGiftBOX...` : 'Loading...'}
          <br />
          {isThisMe ? <OutlinedButton onClick={() => signOut()}>Sign Out</OutlinedButton> : null}
        </>
      )}
    </div>
  );
}