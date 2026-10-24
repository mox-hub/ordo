import { Redirect } from 'expo-router';

/** 根路由：无匹配路径时的入口——认证门（(app)/_layout）会把匿名态弹去 /login */
export default function Index() {
  return <Redirect href="/inbox" />;
}
