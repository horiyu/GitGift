'use client'

import { useRouter } from 'next/navigation'; // ファイルの先頭でimport文を修正
import { useEffect, useState } from 'react';
import { Octokit } from "@octokit/rest";
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

  return (
    <div>
      {user && (
        <>
          <img className={styles.icon} src={user.avatar_url} alt={user.login} style={{ width: "100px", height: "100px" }} />
          <h1>{user.login}</h1>
          <p>Followers: {followers ? followers.length : 'Loading...'}</p>
          <h2>Repositories:</h2>
          <ul>
            {repos ? repos.map(repo => <li key={repo.id}>{repo.name}</li>) : 'Loading...'}
          </ul>
        </>
      )}
    </div>
  );
}