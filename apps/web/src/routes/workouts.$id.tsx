import { useState } from "react";
import { Form, Link, useParams } from "react-router";

export default function WorkoutDetail() {
  const { id } = useParams();
  
  return (
    <div>
      <h1>ワークアウト詳細 #{id}</h1>
      {/* 詳細な実装はオリジナルファイルからコピーします */}
    </div>
  );
} 