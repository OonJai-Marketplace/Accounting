const settingsValuesBefore47=setSettingsFormValues;
setSettingsFormValues=function(group){settingsValuesBefore47(group);document.querySelectorAll('.statutory-bracket-table input').forEach(input=>{const editor=input.parentElement.querySelector('.pit-cell-editor');if(editor)editor.textContent=input.value===''?'':wsNumber(input.value)})};

