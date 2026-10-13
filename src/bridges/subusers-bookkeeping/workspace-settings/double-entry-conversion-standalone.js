const doubleEntryLinesBefore47=doubleEntryLines;
doubleEntryLines=function(journal){return doubleEntryLinesBefore47({...journal,lines:(journal.lines||[]).filter(l=>!wsIsCollection(l))})};
