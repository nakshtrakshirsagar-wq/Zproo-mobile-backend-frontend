package com.zproogo.app.location

import android.app.Activity
import android.content.Intent
import android.content.IntentSender
import android.location.LocationManager
import androidx.core.location.LocationManagerCompat
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.LocationSettingsRequest
import com.google.android.gms.location.Priority

/**
 * NativeModules.ZproogoLocation
 *  - isEnabled(): is the phone's Location (GPS) switch on?
 *  - enable():    shows Google's "For better experience, turn on device location" dialog.
 *                 Tapping OK turns the phone's Location setting ON (no trip to Settings).
 *                 Resolves true when location is on, false when the user declined / it is unavailable.
 */
class ZproogoLocationModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx), ActivityEventListener {
  override fun getName() = "ZproogoLocation"

  private var pending: Promise? = null

  init { ctx.addActivityEventListener(this) }

  @ReactMethod
  fun isEnabled(promise: Promise) {
    try {
      val lm = ctx.getSystemService(android.content.Context.LOCATION_SERVICE) as LocationManager
      promise.resolve(LocationManagerCompat.isLocationEnabled(lm))
    } catch (e: Exception) { promise.resolve(false) }
  }

  @ReactMethod
  fun enable(promise: Promise) {
    val activity = currentActivity
    if (activity == null) { promise.resolve(false); return }
    val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10_000L).build()
    val settings = LocationSettingsRequest.Builder().addLocationRequest(request).setAlwaysShow(true).build()
    LocationServices.getSettingsClient(activity).checkLocationSettings(settings)
      .addOnSuccessListener { promise.resolve(true) } // already on
      .addOnFailureListener { e ->
        if (e is ResolvableApiException) {
          try {
            pending?.resolve(false)
            pending = promise
            e.startResolutionForResult(activity, REQ_ENABLE)
          } catch (ex: IntentSender.SendIntentException) { pending = null; promise.resolve(false) }
        } else promise.resolve(false)
      }
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode == REQ_ENABLE) { pending?.resolve(resultCode == Activity.RESULT_OK); pending = null }
  }

  override fun onNewIntent(intent: Intent) {}

  companion object { private const val REQ_ENABLE = 7421 }
}
