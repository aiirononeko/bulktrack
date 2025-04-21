import { WorkoutList } from "./components/workout-list";

export { loader } from "./loader";

export default function WorkoutsIndex() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">トレーニング履歴</h1>
      <p className="text-sm text-muted-foreground mb-4">
        これまでに記録したトレーニングの履歴を確認できます。
      </p>
      <WorkoutList />
    </div>
  );
}
