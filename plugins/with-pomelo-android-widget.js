const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const receiverName = '.PomeloStatusWidgetProvider';

function withWidgetManifest(config) {
  return withAndroidManifest(config, (nextConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(nextConfig.modResults);
    application.receiver = (application.receiver ?? []).filter(
      (receiver) => receiver.$['android:name'] !== receiverName
    );
    application.receiver.push({
      $: {
        'android:name': receiverName,
        'android:exported': 'true',
        'android:label': '@string/pomelo_widget_name',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
        },
      ],
      'meta-data': [
        {
          $: {
            'android:name': 'android.appwidget.provider',
            'android:resource': '@xml/pomelo_status_widget_info',
          },
        },
      ],
    });
    return nextConfig;
  });
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function withWidgetFiles(config) {
  return withDangerousMod(config, [
    'android',
    (nextConfig) => {
      const androidPackage = AndroidConfig.Package.getPackage(nextConfig);
      if (!androidPackage) {
        throw new Error('android.package is required for the Pomelo widget');
      }

      const main = path.join(nextConfig.modRequest.platformProjectRoot, 'app/src/main');
      const javaPackage = path.join(main, 'java', ...androidPackage.split('.'));

      writeFile(
        path.join(javaPackage, 'PomeloStatusWidgetProvider.kt'),
        `package ${androidPackage}

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class PomeloStatusWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, widgetIds: IntArray) {
    widgetIds.forEach { widgetId ->
      val views = RemoteViews(context.packageName, R.layout.pomelo_status_widget)
      val openApp = Intent(Intent.ACTION_VIEW, Uri.parse("pomelo://widget")).apply {
        setPackage(context.packageName)
      }
      val pendingIntent = PendingIntent.getActivity(
        context,
        widgetId,
        openApp,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      views.setOnClickPendingIntent(R.id.pomelo_widget_root, pendingIntent)
      manager.updateAppWidget(widgetId, views)
    }
  }
}
`
      );

      writeFile(
        path.join(main, 'res/layout/pomelo_status_widget.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
  android:id="@+id/pomelo_widget_root"
  android:layout_width="match_parent"
  android:layout_height="match_parent"
  android:background="@drawable/pomelo_widget_background"
  android:gravity="center_vertical"
  android:orientation="vertical"
  android:padding="16dp">
  <TextView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="@string/pomelo_widget_title"
    android:textColor="#10241B"
    android:textSize="18sp"
    android:textStyle="bold" />
  <TextView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:layout_marginTop="8dp"
    android:text="@string/pomelo_widget_action"
    android:textColor="#AB3419"
    android:textSize="13sp"
    android:textStyle="bold" />
</LinearLayout>
`
      );

      writeFile(
        path.join(main, 'res/drawable/pomelo_widget_background.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="#FDEAB6" />
  <corners android:radius="24dp" />
</shape>
`
      );

      writeFile(
        path.join(main, 'res/xml/pomelo_status_widget_info.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
  android:description="@string/pomelo_widget_description"
  android:initialLayout="@layout/pomelo_status_widget"
  android:minHeight="110dp"
  android:minWidth="110dp"
  android:resizeMode="horizontal|vertical"
  android:targetCellHeight="2"
  android:targetCellWidth="2"
  android:updatePeriodMillis="0"
  android:widgetCategory="home_screen" />
`
      );

      const strings = {
        values: ['Pomelo Moment', "Today\\'s Moment", 'Open Pomelo', "Open today\\'s Pomelo Moment."],
        'values-es': ['Momento de Pomelo', 'Momento de hoy', 'Abrir Pomelo', 'Abre el Momento de hoy.'],
      };
      for (const [directory, [name, title, action, description]] of Object.entries(strings)) {
        writeFile(
          path.join(main, `res/${directory}/pomelo_widget_strings.xml`),
          `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="pomelo_widget_name">${name}</string>
  <string name="pomelo_widget_title">${title}</string>
  <string name="pomelo_widget_action">${action}</string>
  <string name="pomelo_widget_description">${description}</string>
</resources>
`
        );
      }

      return nextConfig;
    },
  ]);
}

module.exports = function withPomeloAndroidWidget(config) {
  return withWidgetFiles(withWidgetManifest(config));
};
