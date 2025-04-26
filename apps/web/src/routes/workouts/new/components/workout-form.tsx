import { ChevronsUpDown, Trash2 } from "lucide-react";
import { useState } from "react";
import { Form } from "react-router";

import type { Exercise } from "ts-utils/src/api/types/exercises";
import type { ExerciseLastRecord } from "ts-utils/src/api/types/menus";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import type { MenuExerciseTemplate } from "../types";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import type { IntensityMode } from "../$menuId/hooks/types";
import { useWorkoutForm } from "../$menuId/hooks/useWorkoutForm";

// WorkoutFormのpropsの型を定義
interface WorkoutFormProps {
  menuId: string;
  workoutId?: string; // 編集用に workoutId を追加 (オプショナル)
  initialExercises: MenuExerciseTemplate[];
  lastRecords?: ExerciseLastRecord[]; // 前回のトレーニング記録（オプション）
  isSubmitting?: boolean; // Add isSubmitting prop
  allExercises: Exercise[]; // ★ 再度追加
}

// WorkoutForm コンポーネント
export function WorkoutForm({
  menuId,
  workoutId, // workoutId を受け取る
  initialExercises,
  lastRecords = [],
  isSubmitting, // Receive isSubmitting prop
  allExercises, // ★ 再度追加
}: WorkoutFormProps) {
  const {
    exerciseLogs,
    errors,
    intensityMode,
    actionData,
    setIntensityMode,
    handleAddSet,
    handleRemoveSet,
    handleInputChange,
    handleFormSubmit,
    getPreviousSet,
    handleRemoveExercise,
    isAddExerciseOpen,
    setIsAddExerciseOpen,
    handleAddExercise,
  } = useWorkoutForm({
    menuId,
    workoutId,
    initialExercises,
    lastRecords,
    allExercises, // ★ 再度追加
  });

  const isEditing = !!workoutId;
  const [exerciseToDeleteIndex, setExerciseToDeleteIndex] = useState<number | null>(null);

  const openDeleteDialog = (index: number) => {
    setExerciseToDeleteIndex(index);
  };

  const confirmDeleteExercise = () => {
    if (exerciseToDeleteIndex !== null) {
      handleRemoveExercise(exerciseToDeleteIndex);
      setExerciseToDeleteIndex(null);
    }
  };

  return (
    <Form method={isEditing ? "patch" : "post"} onSubmit={handleFormSubmit} className="space-y-6">
      {/* エラー表示 */}
      {actionData?.error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
          role="alert"
        >
          <span className="block sm:inline">{actionData.error}</span>
        </div>
      )}

      {/* バリデーションエラー表示 */}
      {errors.form && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
          role="alert"
        >
          <span className="block sm:inline">{errors.form}</span>
        </div>
      )}

      {/* 各エクササイズのログ (アコーディオン) */}
      <Accordion type="multiple" defaultValue={[exerciseLogs[0]?.exerciseId]} className="space-y-4">
        {exerciseLogs.map((log, exerciseIndex) => (
          <AccordionItem
            key={log.exerciseId}
            value={log.exerciseId}
            className="border rounded-lg shadow-sm overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline flex justify-between items-center">
              <h3 className="text-lg font-semibold flex-1 mr-2">{log.exerciseName}</h3>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                {log.sets.map((set, setIndex) => (
                  <div key={set.id}>
                    <div className="flex items-center space-x-2">
                      <label
                        htmlFor={`weight-${exerciseIndex}-${setIndex}`}
                        className="w-10 text-right shrink-0 pr-2"
                      >{`Set ${setIndex + 1}`}</label>

                      {/* Weight Field */}
                      <div className="flex-1">
                        <Input
                          id={`weight-${exerciseIndex}-${setIndex}`}
                          name={`exercises[${exerciseIndex}].sets[${setIndex}].weight`}
                          type="number"
                          placeholder="Weight (kg)"
                          value={set.weight}
                          onChange={(e) =>
                            handleInputChange(exerciseIndex, setIndex, "weight", e.target.value)
                          }
                          className="w-full"
                        />
                      </div>

                      {/* Reps Field */}
                      <div className="flex-1">
                        <Input
                          name={`exercises[${exerciseIndex}].sets[${setIndex}].reps`}
                          type="number"
                          placeholder="Reps"
                          value={set.reps}
                          onChange={(e) =>
                            handleInputChange(exerciseIndex, setIndex, "reps", e.target.value)
                          }
                          className="w-full"
                        />
                      </div>

                      {/* RIR Field (条件付き表示) */}
                      {intensityMode === "rir" && (
                        <div className="flex-1">
                          <Input
                            name={`exercises[${exerciseIndex}].sets[${setIndex}].rir`}
                            type="number"
                            placeholder="RIR"
                            value={set.rir}
                            onChange={(e) =>
                              handleInputChange(exerciseIndex, setIndex, "rir", e.target.value)
                            }
                            className="w-full"
                            min="0"
                            step="0.5"
                          />
                        </div>
                      )}

                      {/* RPE Field (条件付き表示) */}
                      {intensityMode === "rpe" && (
                        <div className="flex-1">
                          <Input
                            name={`exercises[${exerciseIndex}].sets[${setIndex}].rpe`}
                            type="number"
                            placeholder="RPE"
                            value={set.rpe}
                            onChange={(e) =>
                              handleInputChange(exerciseIndex, setIndex, "rpe", e.target.value)
                            }
                            className="w-full"
                            min="1"
                            max="10"
                            step="0.5"
                          />
                        </div>
                      )}

                      {/* セット削除ボタン */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSet(exerciseIndex, setIndex)}
                        className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                        aria-label={`セット ${setIndex + 1} を削除`}
                      >
                        ×
                      </Button>
                    </div>

                    {/* 前回の記録をセット番号が一致する場合のみ表示 */}
                    {(() => {
                      const correspondingPrevSet = getPreviousSet(log.exerciseId, setIndex);

                      // 一致する記録が見つかった場合のみ表示
                      return correspondingPrevSet ? (
                        <div className="ml-12 mt-1 text-xs text-gray-500">
                          <span>前回 (Set {setIndex + 1}): </span>
                          <span>{correspondingPrevSet.weight_kg || 0}kg </span>
                          <span>× {correspondingPrevSet.reps || 0}回</span>
                          {/* 現在のモードに応じてRIR/RPEを優先表示 */}
                          {intensityMode === "rir" ? (
                            <>
                              {typeof correspondingPrevSet.rir === "number" && (
                                <span className="font-medium">
                                  {" "}
                                  (RIR {correspondingPrevSet.rir})
                                </span>
                              )}
                              {typeof correspondingPrevSet.rir !== "number" &&
                                typeof correspondingPrevSet.rpe === "number" && (
                                  <span> (RPE {correspondingPrevSet.rpe})</span>
                                )}
                            </>
                          ) : (
                            <>
                              {typeof correspondingPrevSet.rpe === "number" && (
                                <span className="font-medium">
                                  {" "}
                                  (RPE {correspondingPrevSet.rpe})
                                </span>
                              )}
                              {typeof correspondingPrevSet.rpe !== "number" &&
                                typeof correspondingPrevSet.rir === "number" && (
                                  <span> (RIR {correspondingPrevSet.rir})</span>
                                )}
                            </>
                          )}
                        </div>
                      ) : null; // 見つからなければ何も表示しない
                    })()}
                  </div>
                ))}
                {/* セット追加ボタンとエクササイズ削除ボタン */}
                <div className="mt-4 flex justify-between items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSet(exerciseIndex)}
                  >
                    セット追加
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          openDeleteDialog(exerciseIndex);
                        }}
                        className="text-destructive hover:text-destructive/80 p-1 h-auto"
                        aria-label={`${log.exerciseName} を削除`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    {exerciseToDeleteIndex === exerciseIndex && (
                      <DialogContent
                        onCloseAutoFocus={(e) => e.preventDefault()}
                        onPointerDownOutside={(e) => e.preventDefault()}
                      >
                        <DialogHeader>
                          <DialogTitle>エクササイズの削除</DialogTitle>
                          <DialogDescription>
                            「{log.exerciseName}
                            」と記録中のすべてのセットを削除しますか？この操作は元に戻せません。
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">キャンセル</Button>
                          </DialogClose>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              confirmDeleteExercise();
                            }}
                          >
                            削除
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    )}
                  </Dialog>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* ★ 種目追加ボタンと Popover/Combobox */}
      <div className="mt-6 text-center">
        <Popover open={isAddExerciseOpen} onOpenChange={setIsAddExerciseOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="secondary">
              種目を追加
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Search exercise..." />
              <CommandList>
                <CommandEmpty>No exercise found.</CommandEmpty>
                <CommandGroup>
                  {allExercises?.map((exercise) => (
                    <CommandItem
                      key={exercise.id}
                      value={exercise.id}
                      onSelect={(currentValue) => {
                        const selectedExercise = allExercises.find((ex) => ex.id === currentValue);
                        if (selectedExercise) {
                          handleAddExercise(selectedExercise.id, selectedExercise.name);
                        }
                      }}
                    >
                      {exercise.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* 送信ボタン */}
      <Button type="submit" className="w-full" loading={isSubmitting} disabled={isSubmitting}>
        {isEditing ? "ワークアウトを更新" : "ワークアウトを記録"}
      </Button>
    </Form>
  );
}
