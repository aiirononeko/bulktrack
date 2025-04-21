import { Link } from "react-router";

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
};

type WorkoutProps = {
  workout: {
    id: string;
    title: string;
    date: string;
    exercises: Exercise[];
  };
};

export function WorkoutDetail({ workout }: WorkoutProps) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{workout.title}</h1>
          <p className="text-sm text-muted-foreground">{workout.date}</p>
        </div>
        <Link
          // TODO: 編集ルートへのリンクを実装
          // to={`/workouts/${workout.id}/edit`}
          to="#"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          編集
        </Link>
      </div>

      {workout.exercises.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">まだエクササイズが登録されていません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {workout.exercises.map((exercise) => (
            <div key={exercise.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold">{exercise.name}</h3>
              <p className="text-sm text-gray-600">
                {exercise.sets}セット × {exercise.reps}回 / {exercise.weight}kg
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
