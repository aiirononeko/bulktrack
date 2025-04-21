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
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 text-center">
        <p className="text-muted-foreground mb-4">
          トレーニングを開始するには、メニューを選択してください
        </p>
        <Link
          to="/workouts/new"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
        >
          新しいワークアウト
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {workouts.map((workout) => (
        <Link
          key={workout.id}
          to={`/workouts/${workout.id}`}
          className="block p-6 bg-card rounded-lg border hover:shadow-md transition-shadow duration-200"
        >
          <h3 className="text-lg font-semibold mb-2">{workout.title}</h3>
          <p className="text-sm text-muted-foreground">{workout.date}</p>
        </Link>
      ))}
    </div>
  );
}
