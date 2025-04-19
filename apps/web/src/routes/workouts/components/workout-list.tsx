import { Link } from "react-router";
import { useLoaderData } from "react-router";

type Workout = {
  id: string;
  title: string;
  date: string;
};

export function WorkoutList() {
  const { workouts } = useLoaderData() as { workouts: Workout[] };

  if (workouts.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600 mb-4">
          トレーニングを開始するには、メニューを選択してください
        </p>
        <Link
          to="/menus"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          メニュー一覧へ
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workouts.map((workout) => (
        <div 
          key={workout.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <Link to={`/workouts/${workout.id}`} className="block">
            <h2 className="text-lg font-semibold">{workout.title}</h2>
            <p className="text-sm text-gray-500">{workout.date}</p>
          </Link>
        </div>
      ))}
    </div>
  );
} 