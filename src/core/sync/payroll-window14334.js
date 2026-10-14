/* Retain historical leave usage while downloading detailed payroll by requested year. */
(() => {
  "use strict";
  let missing = false, checkpoint = null, generation14370 = 0;
  async function read(from, to) {
    if (missing === ojmDb) {
      Work82.leaveCarry14334 = [];
      Work82.payrollIndex14334 = [];
      return null;
    }
    const id = liveProfile.id, client = ojmDb, generation = generation14370,
      rows = [];
    let revision,
      carry = [],
      history = [];
    for (let offset = 0; ; offset += 200) {
      const r = await client.rpc("payroll_window14334", {
        p_from: from,
        p_to: to,
        p_offset: offset,
      });
      if (liveProfile?.id !== id || ojmDb !== client || generation !== generation14370)
        throw Error("Account changed while payroll was loading.");
      if (r.error) {
        if (["PGRST202", "42883"].includes(r.error.code)) {
          missing = client;
          Work82.leaveCarry14334 = [];
          Work82.payrollIndex14334 = [];
          window.localFirst14333?.setNotice(
            "Year-window database setup is pending. Complete journal and payroll history remain available.",
          );
          return null;
        }
        throw r.error;
      }
      if (liveProfile?.id !== id)
        throw Error("Account changed while payroll was loading.");
      if (
        !Array.isArray(r.data?.rows) ||
        (offset === 0 &&
          (!Array.isArray(r.data?.carry) || !Array.isArray(r.data?.index))) ||
        !r.data.revision
      )
        throw Error("The payroll window is incomplete.");
      if (offset === 0) {
        revision = r.data.revision;
        if(checkpoint?.actor===id&&checkpoint.client===client&&checkpoint.from===from&&checkpoint.to===to&&checkpoint.revision===revision){Work82.leaveCarry14334=r.data.carry;Work82.payrollIndex14334=r.data.index;return structuredClone(checkpoint.rows);}
        carry = r.data.carry;
        history = r.data.index;
      } else if (revision !== r.data.revision)
        throw Error(
          "Payroll changed during download. Retry to load a consistent period.",
        );
      if (
        r.data.rows.some((r) => !r.id || !r.data || !Array.isArray(r.data.rows))
      )
        throw Error("The payroll window contains an invalid record.");
      rows.push(...r.data.rows);
      if (r.data.rows.length < 200) break;
    }
    checkpoint={actor:id,client,from,to,revision,rows:structuredClone(rows)};
    Work82.leaveCarry14334 = carry;
    Work82.payrollIndex14334 = history;
    return rows;
  }
  function used(id, type, renewal) {
    return (Work82.leaveCarry14334 || [])
      .filter(
        (r) =>
          !Work82.runs.some((run) => run.id === r.runId) &&
          r.employeeId === id &&
          r.date >= renewal &&
          r.month >= String(renewal || "").slice(0, 7) &&
          (r.type === type || (type === "sick" && r.type === "minorSick")),
      )
      .reduce((n, r) => n + Number(r.days), 0);
  }
  async function ensure(month) {
    await window.yearWindow14333?.ensure(month + "-01", month + "-01");
    await loadWork82();
    if (Work82.error) throw Error(Work82.error);
  }
  window.loadPayrollHistory14334 = async () => {
    try {
      await ensure("1900-01");
      renderWork82();
    } catch (e) {
      showCenterStatus(e.message, true);
    }
  };
  window.payrollWindow14334 = {
    read,
    checkpoint:()=>checkpoint&&{actor:checkpoint.actor,from:checkpoint.from,to:checkpoint.to,revision:checkpoint.revision},
    restore(value){const c=value?.payrollRevision14351;if(c?.actor===liveProfile?.id&&Array.isArray(value.runs))checkpoint={...c,client:ojmDb,rows:structuredClone(value.runs)};},
    used,
    ensure,
    hasEmployee(id) {
      return (Work82.payrollIndex14334 || []).some((r) =>
        r.employees?.includes(id),
      );
    },
    finalized(month, id) {
      return (Work82.payrollIndex14334 || []).some(
        (r) =>
          r.status === "finalized" &&
          r.month === month &&
          r.employees?.includes(id),
      );
    },
    reset() {
      generation14370++;missing = false;checkpoint=null;
      Work82.leaveCarry14334 = [];
    },
  };
})();
