package com.zproogo.app.security

import android.content.pm.PackageManager
import android.os.Build
import android.view.WindowManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.StandardIntegrityManager
import java.security.MessageDigest

/**
 * Native security helpers exposed to JS as NativeModules.ZproogoSecurity
 *  - Play Integrity (Standard API): prepare once, then request tokens bound to a request hash.
 *    The SERVER decodes and verifies the token with Google (never trust the verdict on the device).
 *  - FLAG_SECURE: block screenshots / screen recording on sensitive screens.
 *  - signingCertSha256: lets support see if an APK was re-signed (repackaged).
 */
class ZproogoSecurityModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  override fun getName() = "ZproogoSecurity"

  private var provider: StandardIntegrityManager.StandardIntegrityTokenProvider? = null

  @ReactMethod
  fun prepareIntegrity(cloudProjectNumber: Double, promise: Promise) {
    IntegrityManagerFactory.createStandard(ctx.applicationContext)
      .prepareIntegrityToken(
        StandardIntegrityManager.PrepareIntegrityTokenRequest.builder()
          .setCloudProjectNumber(cloudProjectNumber.toLong())
          .build()
      )
      .addOnSuccessListener { provider = it; promise.resolve(true) }
      .addOnFailureListener { promise.reject("INTEGRITY_PREPARE_FAILED", it) }
  }

  @ReactMethod
  fun integrityToken(requestHash: String, promise: Promise) {
    val p = provider ?: return promise.reject("INTEGRITY_NOT_READY", "Call prepareIntegrity first")
    p.request(StandardIntegrityManager.StandardIntegrityTokenRequest.builder().setRequestHash(requestHash).build())
      .addOnSuccessListener { promise.resolve(it.token()) }
      .addOnFailureListener {
        provider = null // provider can expire; JS prepares again next time
        promise.reject("INTEGRITY_TOKEN_FAILED", it)
      }
  }

  @ReactMethod
  fun setSecure(on: Boolean) {
    val activity = reactApplicationContext.currentActivity ?: return
    activity.runOnUiThread {
      if (on) activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
      else activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }
  }

  @Suppress("DEPRECATION")
  @ReactMethod
  fun signingCertSha256(promise: Promise) {
    try {
      val pm = ctx.packageManager
      val sigs = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        pm.getPackageInfo(ctx.packageName, PackageManager.GET_SIGNING_CERTIFICATES).signingInfo?.apkContentsSigners
      } else {
        pm.getPackageInfo(ctx.packageName, PackageManager.GET_SIGNATURES).signatures
      }
      val cert = sigs?.firstOrNull()?.toByteArray() ?: return promise.resolve(null)
      val hex = MessageDigest.getInstance("SHA-256").digest(cert).joinToString(":") { "%02X".format(it) }
      promise.resolve(hex)
    } catch (e: Exception) {
      promise.reject("CERT_FAILED", e)
    }
  }
}
