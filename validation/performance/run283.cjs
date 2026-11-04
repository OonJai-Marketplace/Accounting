const {spawnSync}=require('node:child_process'),path=require('node:path');
const cwd=path.resolve(__dirname,'../..');
const tests=['performance/save-path283.cjs','performance/draft-path283.cjs','performance/access-path283.cjs','test-account-draft-typing272.cjs','test-payroll-save281.cjs','test-payroll-direct281.cjs','test-payroll-workflow277.cjs','test-report-crossflows276.cjs','test-report-notices270.cjs','test-report-draft-recovery261.cjs','test-journal-performance261.cjs','test-report-years143182.cjs','test-report-preparation267.cjs','test-payroll-journal274.cjs','test-payroll-tax-settings.cjs'];
for(const name of tests){const result=spawnSync(process.execPath,['validation/'+name],{cwd,env:{...process.env,NODE_PATH:path.join(__dirname,'node_modules')},stdio:'inherit'});if(result.status!==0)process.exit(result.status||1)}
console.log(`PASS ${tests.length} performance/recovery and accounting regression suites; synthetic data only.`);
