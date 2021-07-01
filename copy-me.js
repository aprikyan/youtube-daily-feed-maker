function videoRow(video) {
  var out = `<tr>
          <td style="width:800; text-align:center; vertical-align:middle">
            <a href="${video[4]}"><img src="${video[5]}" style="max-height:90%; max-width:90%" /></a>
          </td>
          <td style="vertical-align:middle;">
            <p><a href="${video[4]}"><h2 style="color: #333333;"><strong>${video[3]}</strong></h2></a></p>
            <p><span style="color: #333333;"><a href="${video[2]}" target="_blank">${video[1]}</a> / ${video[6]}</span></p>
          </td>
        </tr>\n`;
  return out;
}

function composeEmail(videos) {
  var body = '<table style="border-collapse: collapse; width: 100%;" border="0">\n';
  body += "<tbody>\n";
  for (i in videos)
    body += videoRow(videos[i]);
  body += "</tbody>\n";
  body += "</table>";
  return body;
}

function sendEmail(recipient, videos) {
  MailApp.sendEmail({
    to: recipient,
    subject: `Daily YouTube Feed (${new Date().toJSON().slice(0,10).replace(/-/g,'/')})`,
    htmlBody: composeEmail(videos)
  });
}

function parseXml(id, today) {
  var url = `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;
  var xml = UrlFetchApp.fetch(url).getContentText();
  var document = XmlService.parse(xml);
  var root = document.getRootElement();
  var atom = XmlService.getNamespace('http://www.w3.org/2005/Atom');
  var videos = [];
  
  var author = root.getChild('author', atom);
  const channelTitle = author.getChild('name', atom).getValue();
  const channelURL = author.getChild('uri', atom).getValue();

  var entries = root.getChildren('entry', atom);
  for (var i = 0; i < entries.length; i++) {
    var date = new Date(entries[i].getChild('published', atom).getValue());
    if (today - date.valueOf() <= 24 * 3600 * 1000) {
      var title = entries[i].getChild('title', atom).getText();
      var link = entries[i].getChild('link', atom).getAttribute("href").getValue();
      var media = entries[i].getChildren();
      
      for (j in media) {
        if (media[j].getName() == "group") {
          var group = media[j].getChildren()
          for (k in group) {
            if (group[k].getName() == "thumbnail")
              var thumbnail = group[k].getAttribute("url").getValue();
          }
        }
      }

      var timePassed = Math.floor((today - date) / (60 * 1000));
      timePassed = timePassed < 60 ? `${timePassed}m` : `${Math.floor(timePassed / 60)}h`
      timePassed += " ago"

      videos.push([date.valueOf(), channelTitle, channelURL, title, link, thumbnail, timePassed]);
    };
  }

  return videos;
}

function parseChannels(ids) {
  const today = Date.now();
  var videos = [];
  
  for (i in ids) {
    var channel = parseXml(ids[i], today);
    videos = videos.concat(channel);
  }
  videos = videos.sort();
  return videos;
}

function getSubscriptions() {
  var nextPageToken = "";
  var ids = [];
  while (nextPageToken != null) {
    var channels = YouTube.Subscriptions.list(('id', 'snippet'), {
      mine: true,
      pageToken: nextPageToken,
      maxResults: 150
    });
    
    for (var i = 0; i < channels.items.length; i++) {
      var channel = channels.items[i];
      var channelId = channel.snippet.resourceId.channelId;
      ids.push(channelId);
    }
    nextPageToken = channels.nextPageToken;
  }
  return ids;
}

function letsGo(recipient=YOUR_EMAIL_ADDRESS_HERE) {
  sendEmail(recipient, parseChannels(getSubscriptions()));
}
