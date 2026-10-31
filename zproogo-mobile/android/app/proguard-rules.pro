# ---- Zproogo release shrinking / obfuscation (R8) ----
# React Native + Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
# Our native module is called by name from JS
-keep class com.zproogo.app.security.** { *; }
# Razorpay
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** { *; }
-optimizations !method/inlining/*
-keepclasseswithmembers class * { public void onPayment*(...); }
# Play Integrity
-keep class com.google.android.play.core.integrity.** { *; }
# Keychain / MMKV
-keep class com.oblador.keychain.** { *; }
-keep class com.tencent.mmkv.** { *; }
# Strip Android logs from release
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}
