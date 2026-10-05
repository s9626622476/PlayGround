package com.example.tuckerreward;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

import java.util.Arrays;

/**
 * TUCKER REWARD - MainActivity
 * -----------------------------------------------------------------------
 * Implements the 3 AdMob ad formats required by an earning app:
 *   1. Banner        -> sticky bottom bar, loaded in background, hides itself on failure.
 *   2. Interstitial   -> pre-loaded on launch, shown on "Next Page" click, auto-reloaded.
 *   3. Rewarded Video -> loaded on launch, shown on "Watch Video" click,
 *                         coins granted ONLY in onUserEarnedReward().
 *
 * SAFETY: every single ad call (load + show) is wrapped so a failure NEVER
 * crashes the app and NEVER blocks the core UI / navigation.
 * -----------------------------------------------------------------------
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "TuckerReward_Ads";

    // ---- STEP 1: Real AdMob Ad Unit IDs (serve as "Test Ad" on your whitelisted device) ----
    private static final String BANNER_ID = "ca-app-pub-6135318159060723/6519348835";
    private static final String INTERSTITIAL_ID = "ca-app-pub-6135318159060723/8759422808";
    private static final String REWARDED_ID = "ca-app-pub-6135318159060723/2771675512";

    // TODO: Replace with your device's real test-device hash.
    // Run once -> check Logcat for: "Use RequestConfiguration.Builder.setTestDeviceIds(...)"
    private static final String TEST_DEVICE_ID = "TEST_DEVICE_ID_HERE";

    private AdView adView;
    private InterstitialAd interstitialAd;
    private RewardedAd rewardedAd;

    // Guard flags so we never fire 2 simultaneous load requests for the same format
    private boolean isInterstitialLoading = false;
    private boolean isRewardedLoading = false;

    private Button btnNextPage;
    private Button btnWatchVideo;
    private TextView tvCoins;

    private int coins = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        tvCoins = findViewById(R.id.tvCoins);
        btnNextPage = findViewById(R.id.btnNextPage);
        btnWatchVideo = findViewById(R.id.btnWatchVideo);
        adView = findViewById(R.id.adView);

        // =====================================================================
        // STEP 2: Initialize the Mobile Ads SDK (App Launch / onCreate block)
        // =====================================================================
        try {
            RequestConfiguration configuration = new RequestConfiguration.Builder()
                    .setTestDeviceIds(Arrays.asList(TEST_DEVICE_ID))
                    .build();
            MobileAds.setRequestConfiguration(configuration);

            MobileAds.initialize(this, new OnInitializationCompleteListener() {
                @Override
                public void onInitializationComplete(@NonNull InitializationStatus initializationStatus) {
                    Log.d(TAG, "MobileAds SDK initialized. Loading all ad formats...");
                    // SDK is ready -> safe to request all 3 ad formats now.
                    loadBannerAd();
                    loadInterstitialAd();
                    loadRewardedAd();
                }
            });
        } catch (Exception e) {
            // Even if ad SDK init throws, the app must keep working.
            Log.e(TAG, "MobileAds.initialize() failed: " + e.getMessage());
        }

        updateCoinsUI();

        // "Next Page" / "Submit Task" button -> Interstitial trigger
        btnNextPage.setOnClickListener(v -> showInterstitialThenNavigate());

        // "Watch Video to Earn Points" button -> Rewarded trigger
        btnWatchVideo.setOnClickListener(v -> showRewardedAd());
    }

    // =========================================================================
    // STEP 3A: BANNER AD  (sticky bottom bar, 320x50, match_parent width)
    // =========================================================================
    private void loadBannerAd() {
        if (adView == null) return;
        try {
            adView.setAdListener(new AdListener() {
                @Override
                public void onAdLoaded() {
                    Log.d(TAG, "Banner loaded successfully.");
                    adView.setVisibility(android.view.View.VISIBLE);
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError adError) {
                    // Error Code 3 = NO_FILL, or network timeout, etc.
                    Log.e(TAG, "Banner failed to load. Code=" + adError.getCode()
                            + " Message=" + adError.getMessage());
                    // Graceful fallback: hide the banner slot completely so the
                    // main UI content is never blocked or overlapped by an empty ad frame.
                    adView.setVisibility(android.view.View.GONE);
                }
            });
            AdRequest adRequest = new AdRequest.Builder().build();
            adView.loadAd(adRequest);
        } catch (Exception e) {
            Log.e(TAG, "Banner load exception: " + e.getMessage());
            adView.setVisibility(android.view.View.GONE);
        }
    }

    // =========================================================================
    // STEP 3B: INTERSTITIAL AD (preloaded on launch, shown on Next Page click)
    // =========================================================================
    private void loadInterstitialAd() {
        if (isInterstitialLoading) return; // avoid duplicate in-flight requests
        isInterstitialLoading = true;
        try {
            AdRequest adRequest = new AdRequest.Builder().build();
            InterstitialAd.load(this, INTERSTITIAL_ID, adRequest, new InterstitialAdLoadCallback() {
                @Override
                public void onAdLoaded(@NonNull InterstitialAd ad) {
                    Log.d(TAG, "Interstitial loaded and ready to show.");
                    isInterstitialLoading = false;
                    interstitialAd = ad;
                    setInterstitialCallbacks();
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    Log.e(TAG, "Interstitial failed to load. Code=" + loadAdError.getCode()
                            + " Message=" + loadAdError.getMessage());
                    isInterstitialLoading = false;
                    interstitialAd = null; // fallback: button will just navigate directly
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Interstitial load exception: " + e.getMessage());
            isInterstitialLoading = false;
            interstitialAd = null;
        }
    }

    private void setInterstitialCallbacks() {
        if (interstitialAd == null) return;
        interstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                Log.d(TAG, "Interstitial dismissed by user.");
                interstitialAd = null;
                navigateToNextScreen();
                loadInterstitialAd(); // pre-load the next one immediately
            }

            @Override
            public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                Log.e(TAG, "Interstitial failed to show: " + adError.getMessage());
                interstitialAd = null;
                navigateToNextScreen(); // never block navigation on an ad failure
                loadInterstitialAd();
            }

            @Override
            public void onAdShowedFullScreenContent() {
                // An InterstitialAd instance can only be shown once - clear the reference.
                interstitialAd = null;
            }
        });
    }

    /** Called by btnNextPage / "Submit Task" click. */
    private void showInterstitialThenNavigate() {
        try {
            if (interstitialAd != null) {
                interstitialAd.show(MainActivity.this);
            } else {
                // Ad not ready (still loading / failed / no fill) -> never block the user.
                Log.d(TAG, "Interstitial not ready - navigating directly.");
                navigateToNextScreen();
                loadInterstitialAd();
            }
        } catch (Exception e) {
            Log.e(TAG, "Interstitial show exception: " + e.getMessage());
            navigateToNextScreen();
        }
    }

    private void navigateToNextScreen() {
        try {
            Intent intent = new Intent(MainActivity.this, NextActivity.class);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Unable to open next page", Toast.LENGTH_SHORT).show();
        }
    }

    // =========================================================================
    // STEP 3C: REWARDED VIDEO AD (Earning Task section)
    // =========================================================================
    private void loadRewardedAd() {
        if (isRewardedLoading) return;
        isRewardedLoading = true;
        try {
            AdRequest adRequest = new AdRequest.Builder().build();
            RewardedAd.load(this, REWARDED_ID, adRequest, new RewardedAdLoadCallback() {
                @Override
                public void onAdLoaded(@NonNull RewardedAd ad) {
                    Log.d(TAG, "Rewarded ad loaded and ready to show.");
                    isRewardedLoading = false;
                    rewardedAd = ad;
                    setRewardedCallbacks();
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    Log.e(TAG, "Rewarded ad failed to load. Code=" + loadAdError.getCode()
                            + " Message=" + loadAdError.getMessage());
                    isRewardedLoading = false;
                    rewardedAd = null; // fallback handled in showRewardedAd()
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Rewarded load exception: " + e.getMessage());
            isRewardedLoading = false;
            rewardedAd = null;
        }
    }

    private void setRewardedCallbacks() {
        if (rewardedAd == null) return;
        rewardedAd.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                Log.d(TAG, "Rewarded ad closed.");
                rewardedAd = null;
                loadRewardedAd(); // pre-load the next one so it is ready for the next tap
            }

            @Override
            public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                Log.e(TAG, "Rewarded ad failed to show: " + adError.getMessage());
                rewardedAd = null;
                loadRewardedAd();
            }

            @Override
            public void onAdShowedFullScreenContent() {
                // An instance can only be shown once - clear the reference.
                rewardedAd = null;
            }
        });
    }

    /** Called by btnWatchVideo ("Watch Video to Earn Points") click. */
    private void showRewardedAd() {
        try {
            if (rewardedAd != null) {
                rewardedAd.show(MainActivity.this, rewardItem -> {
                    // =========================================================
                    // CRITICAL RULE: coins/points are granted ONLY inside this
                    // OnUserEarnedRewardListener callback, which the SDK fires
                    // exclusively after the video has been fully watched.
                    // =========================================================
                    int amount = rewardItem.getAmount(); // AdMob-configured reward amount
                    coins += (amount > 0 ? amount : 10); // fallback to 10 if unset
                    updateCoinsUI();
                    Toast.makeText(MainActivity.this, "You earned " + (amount > 0 ? amount : 10) + " coins!",
                            Toast.LENGTH_SHORT).show();
                    Log.d(TAG, "Reward granted: " + amount + " " + rewardItem.getType());
                });
            } else {
                // Video not loaded yet (still loading / no fill / network error).
                Toast.makeText(this, "Video not ready", Toast.LENGTH_SHORT).show();
                loadRewardedAd(); // try to have one ready for the next attempt
            }
        } catch (Exception e) {
            Log.e(TAG, "Rewarded show exception: " + e.getMessage());
            Toast.makeText(this, "Video not ready", Toast.LENGTH_SHORT).show();
        }
    }

    private void updateCoinsUI() {
        if (tvCoins != null) {
            tvCoins.setText("Coins: " + coins);
        }
    }

    // =========================================================================
    // AdView lifecycle - required by AdMob so the banner behaves correctly
    // when the Activity is paused / resumed / destroyed.
    // =========================================================================
    @Override
    protected void onDestroy() {
        if (adView != null) {
            adView.destroy();
        }
        super.onDestroy();
    }

    @Override
    protected void onPause() {
        if (adView != null) {
            adView.pause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (adView != null) {
            adView.resume();
        }
    }
}
