# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep Expo classes
-keep class expo.** { *; }
-keep class expo.modules.** { *; }

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# Keep JavaScript interface methods
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
}

# Keep Parcelable classes
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep native libraries
-keep class com.google.android.gms.** { *; }
-keep class com.google.firebase.** { *; }

# Firebase Cloud Messaging
-keep class com.google.firebase.messaging.** { *; }
-keep class com.google.firebase.iid.** { *; }

# Firebase Analytics
-keep class com.google.firebase.analytics.** { *; }
-keep class com.google.android.gms.measurement.** { *; }

# Firebase common
-keep class com.google.firebase.components.** { *; }
-keep class com.google.firebase.installations.** { *; }

# Keep Supabase related classes
-keep class io.supabase.** { *; }
-keep class com.supabase.** { *; }

# Keep notification related classes
-keep class expo.notifications.** { *; }

# Keep calendar related classes
-keep class expo.calendar.** { *; }

# Keep image picker related classes
-keep class expo.imagepicker.** { *; }

# Add any project specific keep options here:

# Enable deobfuscation file generation
-printmapping mapping.txt
-printseeds seeds.txt
-printconfiguration configuration.txt
