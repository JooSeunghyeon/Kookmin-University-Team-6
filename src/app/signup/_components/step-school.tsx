"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { primaryButtonClass } from "@/components/ui/form-field";
import type { SchoolOption } from "./types";

interface StepSchoolProps {
  selectedSchoolId: string;
  onSelect: (school: SchoolOption) => void;
  onNext: () => void;
}

async function fetchActiveSchools(): Promise<SchoolOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schools")
    .select("id, name, email_domain")
    .eq("is_active", true)
    .order("name");

  if (error || !data) {
    return [];
  }
  return data;
}

export function StepSchool({ selectedSchoolId, onSelect, onNext }: StepSchoolProps) {
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActiveSchools().then((loaded) => {
      setSchools(loaded);
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">학교를 선택해 주세요</h1>
        <p className="mt-1 text-sm text-gray-500">같은 학교 학생끼리만 의뢰를 주고받아요.</p>
      </div>

      {isLoading && <p className="text-sm text-gray-400">학교 목록을 불러오는 중...</p>}
      {!isLoading && schools.length === 0 && (
        <p className="text-sm text-gray-400">등록된 학교가 없어요.</p>
      )}

      <div className="flex flex-col gap-2">
        {schools.map((school) => (
          <button
            key={school.id}
            type="button"
            onClick={() => onSelect(school)}
            className={`btn-h rounded-xl border px-4 text-left text-base font-medium transition ${
              selectedSchoolId === school.id
                ? "border-[#3B5BFD] bg-[#3B5BFD]/5 text-[#3B5BFD]"
                : "border-gray-200 text-gray-700"
            }`}
          >
            {school.name}
            <span className="ml-2 text-xs text-gray-400">@{school.email_domain}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className={primaryButtonClass}
        disabled={!selectedSchoolId}
        onClick={onNext}
      >
        다음
      </button>
    </div>
  );
}
