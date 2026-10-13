const reviewCardBefore47=reviewCardHtml;
reviewCardHtml=function(journal){let html=reviewCardBefore47(journal);if(journal.lines?.every(wsIsCollection))html=html.replace('Approve &amp; Prepare Journal','Review Collection Report');return html};
