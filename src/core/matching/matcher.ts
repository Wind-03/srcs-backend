import type { MatchStrategy } from '../../schemas';

/** Minimal student shape the matcher needs (decoupled from persistence). */
export interface MatchableStudent {
  id: string;
  fullName: string;
  registrationNumber: string;
  utmeNumber: string | null;
  department: string;
}

export interface MatchableRow {
  rowNumber: number;
  fullName?: string;
  registrationNumber?: string;
  utmeNumber?: string;
  department?: string;
  score?: number;
}

export interface MatchResult {
  rowNumber: number;
  matchedStudentId: string | null;
  strategy: MatchStrategy;
}

const norm = (v?: string | null): string =>
  (v ?? '').toUpperCase().replace(/\s+/g, '');

/**
 * Index students by each key once, so matching a table is O(rows) rather than
 * O(rows × students). Name+department keys can collide (two students with the
 * same name in a department); such keys are marked ambiguous and never used for
 * a fallback match, to avoid assigning a score to the wrong person.
 */
export class StudentIndex {
  private readonly byReg = new Map<string, string>();
  private readonly byUtme = new Map<string, string>();
  private readonly byNameDept = new Map<string, string | null>(); // null => ambiguous

  constructor(students: MatchableStudent[]) {
    for (const s of students) {
      const reg = norm(s.registrationNumber);
      if (reg) this.byReg.set(reg, s.id);

      const utme = norm(s.utmeNumber);
      if (utme) this.byUtme.set(utme, s.id);

      const nameDept = `${norm(s.fullName)}::${norm(s.department)}`;
      if (norm(s.fullName) && norm(s.department)) {
        this.byNameDept.set(
          nameDept,
          this.byNameDept.has(nameDept) ? null : s.id,
        );
      }
    }
  }

  match(row: MatchableRow): MatchResult {
    const reg = norm(row.registrationNumber);
    if (reg && this.byReg.has(reg)) {
      return {
        rowNumber: row.rowNumber,
        matchedStudentId: this.byReg.get(reg)!,
        strategy: 'REGISTRATION_NUMBER',
      };
    }

    const utme = norm(row.utmeNumber);
    if (utme && this.byUtme.has(utme)) {
      return {
        rowNumber: row.rowNumber,
        matchedStudentId: this.byUtme.get(utme)!,
        strategy: 'UTME_NUMBER',
      };
    }

    const nameDept = `${norm(row.fullName)}::${norm(row.department)}`;
    if (norm(row.fullName) && norm(row.department)) {
      const candidate = this.byNameDept.get(nameDept);
      if (candidate) {
        return {
          rowNumber: row.rowNumber,
          matchedStudentId: candidate,
          strategy: 'NAME_AND_DEPARTMENT',
        };
      }
    }

    return {
      rowNumber: row.rowNumber,
      matchedStudentId: null,
      strategy: 'UNMATCHED',
    };
  }
}

/** Match every row against the student set, preserving row order. */
export function matchRows(
  rows: MatchableRow[],
  students: MatchableStudent[],
): MatchResult[] {
  const index = new StudentIndex(students);
  return rows.map((r) => index.match(r));
}
