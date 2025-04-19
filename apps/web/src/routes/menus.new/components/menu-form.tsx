import { Form, useLoaderData } from "react-router";
import { useState } from "react";

type ExerciseTemplate = {
  id: string;
  name: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
};

type MenuExercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  notes?: string;
};

export function MenuForm() {
  const { exercises } = useLoaderData() as { exercises: ExerciseTemplate[] };
  const [menuExercises, setMenuExercises] = useState<MenuExercise[]>([]);
  
  const addExercise = () => {
    const newExercise: MenuExercise = {
      id: `temp-${Date.now()}`,
      name: "",
      sets: 3,
      reps: 10,
      weight: 0,
      notes: ""
    };
    
    setMenuExercises([...menuExercises, newExercise]);
  };
  
  return (
    <Form method="post" className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          メニュー名
        </label>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="メニューの名前"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          required
        />
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          説明
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="メニューの説明"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
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
        
        {menuExercises.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-gray-500">エクササイズを追加してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {menuExercises.map((exercise, index) => (
              <div key={exercise.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 gap-4 mb-2">
                  <div>
                    <label htmlFor={`exercises[${index}].name`} className="block text-sm font-medium text-gray-700 mb-1">
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
                </div>
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div>
                    <label htmlFor={`exercises[${index}].sets`} className="block text-sm font-medium text-gray-700 mb-1">
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
                  <div>
                    <label htmlFor={`exercises[${index}].reps`} className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label htmlFor={`exercises[${index}].weight`} className="block text-sm font-medium text-gray-700 mb-1">
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
                <div>
                  <label htmlFor={`exercises[${index}].notes`} className="block text-sm font-medium text-gray-700 mb-1">
                    メモ
                  </label>
                  <textarea
                    id={`exercises[${index}].notes`}
                    name={`exercises[${index}].notes`}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    defaultValue={exercise.notes}
                  />
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