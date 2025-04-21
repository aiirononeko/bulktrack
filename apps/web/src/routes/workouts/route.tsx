import { Outlet } from "react-router";

export function meta() {
  return [
    { title: "トレーニング記録 - BulkTrack" },
    { name: "description", content: "トレーニングの記録を管理" },
  ];
}

export default function WorkoutsLayout() {
  return <Outlet />;
}
