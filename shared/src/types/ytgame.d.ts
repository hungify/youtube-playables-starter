/**
 * Official YouTube Playables SDK v1 TypeScript Declarations
 * Source: https://www.youtube.com/playablesportal/static/youtube_ytgame_web_deploy_mpm_files/index.d.ts
 */

export interface YTGameError extends Error {
    readonly errorType?: YTGameErrorType;
}

export type YTGameErrorType =
    | 'UNKNOWN'
    | 'API_UNAVAILABLE'
    | 'INVALID_PARAMS'
    | 'SIZE_LIMIT_EXCEEDED'
    | number;

export interface YTGameScore {
    readonly value: number;
}

export interface YTGameAdsNamespace {
    requestInterstitialAd(): Promise<void>;
    requestRewardedAd(rewardId: string): Promise<boolean>;
}

export interface YTGameEngagementNamespace {
    sendScore(score: YTGameScore): Promise<void>;
}

export interface YTGameLifecycleNamespace {
    firstFrameReady(): void;
    gameReady(): void;
    loadData(): Promise<string>;
    saveData(data: string): Promise<void>;
}

export interface YTGameHealthNamespace {
    logError(): void;
    logWarning(): void;
}

export interface YTGameSystemNamespace {
    isAudioEnabled(): boolean;
    onAudioEnabledChange(callback: (isAudioEnabled: boolean) => void): () => void;
    onPause(callback: () => void): () => void;
    onResume(callback: () => void): () => void;
    getLanguage(): Promise<string>;
}

export interface YTGameSDK {
    readonly SDK_VERSION: string;
    readonly IN_PLAYABLES_ENV: boolean;
    readonly ads?: YTGameAdsNamespace;
    readonly engagement: YTGameEngagementNamespace;
    readonly game: YTGameLifecycleNamespace;
    readonly health: YTGameHealthNamespace;
    readonly system: YTGameSystemNamespace;
}

declare global {
    interface Window {
        ytgame?: YTGameSDK;
    }
    const ytgame: YTGameSDK | undefined;
}
