import { useState } from "react";
import { Form, useLoaderData } from "react-router";

type ExerciseInput = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
};

type ExerciseTemplate = {
  id: string;
  name: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
};

export function WorkoutForm() {
  const { exercises } = useLoaderData() as { exercises: ExerciseTemplate[] };
  const [workoutExercises, setWorkoutExercises] = useState<ExerciseInput[]>([]);

  const addExercise = () => {
    const newExercise: ExerciseInput = {
      id: `temp-${Date.now()}`,
      name: "",
      sets: 3,
      reps: 10,
      weight: 0,
    };

    setWorkoutExercises([...workoutExercises, newExercise]);
  };

  return (
    <Form method="post" className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          タイトル
        </label>
        <input
          type="text"
          id="title"
          name="title"
          placeholder="ワークアウトのタイトル"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
          日付
        </label>
        <input
          type="date"
          id="date"
          name="date"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          defaultValue={new Date().toISOString().split("T")[0]}
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium">エクササイズ</h3>
          <button
            type="button"
            onClick={addExercise}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + エクササイズを追加
          </button>
        </div>

        {workoutExercises.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-gray-500">エクササイズを追加してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workoutExercises.map((exercise, index) => (
              <div key={exercise.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <label
                      htmlFor={`exercises[${index}].name`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      エクササイズ名
                    </label>
                    <input
                      type="text"
                      id={`exercises[${index}].name`}
                      name={`exercises[${index}].name`}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`exercises[${index}].sets`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      セット数
                    </label>
                    <input
                      type="number"
                      id={`exercises[${index}].sets`}
                      name={`exercises[${index}].sets`}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      min="1"
                      defaultValue={exercise.sets}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor={`exercises[${index}].reps`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      レップ数
                    </label>
                    <input
                      type="number"
                      id={`exercises[${index}].reps`}
                      name={`exercises[${index}].reps`}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      min="1"
                      defaultValue={exercise.reps}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`exercises[${index}].weight`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      重量 (kg)
                    </label>
                    <input
                      type="number"
                      id={`exercises[${index}].weight`}
                      name={`exercises[${index}].weight`}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      min="0"
                      step="0.5"
                      defaultValue={exercise.weight}
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4">
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
        >
          保存する
        </button>
      </div>
    </Form>
  );
}
