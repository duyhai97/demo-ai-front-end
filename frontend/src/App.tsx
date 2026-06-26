import { useState } from "react";

type VideoJob = {
    jobId: string;
    productName: string;
    affiliateLink: string;
    status: string;
    imagePaths?: string[];
    script?: string;
    videoUrl?: string;
    progress?: number;
    currentStep?: string;
    error?: string;
};

function App() {
    const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

    const [productName, setProductName] = useState("");
    const [affiliateLink, setAffiliateLink] = useState("");
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [job, setJob] = useState<VideoJob | null>(null);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setLogs((old) => [`${new Date().toLocaleTimeString()} - ${msg}`, ...old]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        previewUrls.forEach((url) => URL.revokeObjectURL(url));

        setImageFiles(files);
        setPreviewUrls(files.map((file) => URL.createObjectURL(file)));

        addLog(`Đã chọn ${files.length} ảnh`);
    };

    const removeImage = (index: number) => {
        URL.revokeObjectURL(previewUrls[index]);

        setImageFiles((old) => old.filter((_, i) => i !== index));
        setPreviewUrls((old) => old.filter((_, i) => i !== index));

        addLog(`Đã xoá ảnh ${index + 1}`);
    };

    const clearImages = () => {
        previewUrls.forEach((url) => URL.revokeObjectURL(url));

        setImageFiles([]);
        setPreviewUrls([]);

        addLog("Đã xoá toàn bộ ảnh");
    };

    const uploadImages = async () => {
        const imagePaths: string[] = [];

        for (let i = 0; i < imageFiles.length; i++) {
            const formData = new FormData();
            formData.append("file", imageFiles[i]);

            addLog(`Upload ảnh ${i + 1}/${imageFiles.length}`);

            const res = await fetch(`${API}/api/videos/upload`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                throw new Error("Upload ảnh lỗi");
            }

            const data = await res.json();
            imagePaths.push(data.imagePath);
        }

        return imagePaths;
    };

    const createJob = async (imagePaths: string[]) => {
        const res = await fetch(`${API}/api/videos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                productName,
                affiliateLink,
                imagePaths,
            }),
        });

        if (!res.ok) {
            throw new Error("Tạo job lỗi");
        }

        return (await res.json()) as VideoJob;
    };

    const pollJob = (jobId: string) => {
        const timer = setInterval(async () => {
            try {
                const res = await fetch(`${API}/api/videos/${jobId}`);

                if (!res.ok) {
                    throw new Error("Không lấy được trạng thái job");
                }

                const current = (await res.json()) as VideoJob;
                setJob(current);

                if (current.currentStep) {
                    addLog(current.currentStep);
                }

                if (current.status === "DONE") {
                    addLog("Video đã tạo xong");
                    clearInterval(timer);
                    setLoading(false);
                }

                if (current.status === "FAILED") {
                    addLog(current.error || "Tạo video thất bại");
                    clearInterval(timer);
                    setLoading(false);
                }
            } catch (e: any) {
                addLog(e.message || "Polling lỗi");
                clearInterval(timer);
                setLoading(false);
            }
        }, 2000);
    };

    const handleCreateVideo = async () => {
        try {
            if (!productName.trim()) {
                return alert("Nhập tên sản phẩm");
            }

            if (imageFiles.length === 0) {
                return alert("Chọn ít nhất 1 ảnh");
            }

            setLoading(true);
            setJob(null);
            setLogs([]);

            const imagePaths = await uploadImages();

            addLog("Tạo job video");

            const createdJob = await createJob(imagePaths);

            setJob(createdJob);

            addLog(`Job ID: ${createdJob.jobId}`);

            pollJob(createdJob.jobId);
        } catch (e: any) {
            addLog(e.message || "Có lỗi xảy ra");
            setLoading(false);
        }
    };

    const videoSrc = job?.videoUrl ? `${API}${job.videoUrl}` : "";
    const progress = job?.progress ?? 0;
    const currentStep = job?.currentStep || "Đang chờ xử lý";

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.header}>
                    <div>
                        <div style={styles.badge}>TikTok Affiliate Tool</div>
                        <h1 style={styles.title}>AI Video Generator</h1>
                        <p style={styles.subtitle}>
                            Upload nhiều ảnh sản phẩm, AI tạo script, voice và render video tự động.
                        </p>
                    </div>

                    <button
                        disabled={loading}
                        onClick={handleCreateVideo}
                        style={{
                            ...styles.button,
                            opacity: loading ? 0.55 : 1,
                            cursor: loading ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? "Đang tạo..." : "🚀 Generate Video"}
                    </button>
                </div>

                <div style={styles.grid}>
                    <div style={styles.card}>
                        <label style={styles.label}>Tên sản phẩm</label>
                        <input
                            style={styles.input}
                            placeholder="Ví dụ: Áo bóng đá Bồ Đào Nha"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                        />

                        <label style={styles.label}>Link Affiliate</label>
                        <input
                            style={styles.input}
                            placeholder="https://..."
                            value={affiliateLink}
                            onChange={(e) => setAffiliateLink(e.target.value)}
                        />

                        <label style={styles.label}>Ảnh sản phẩm</label>
                        <label style={styles.uploadBox}>
                            <div style={{ fontSize: 34 }}>📸</div>
                            <div style={{ fontWeight: 800, marginTop: 8 }}>Chọn nhiều ảnh</div>
                            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                                PNG, JPG, WEBP
                            </div>

                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                                style={{ display: "none" }}
                            />
                        </label>

                        {previewUrls.length > 0 && (
                            <div style={{ marginTop: 18 }}>
                                <div style={styles.previewHeader}>
                                    <span>Preview ảnh</span>

                                    <div style={styles.previewActions}>
                                        <span style={styles.count}>{previewUrls.length} ảnh</span>

                                        <button
                                            type="button"
                                            onClick={clearImages}
                                            style={styles.clearButton}
                                        >
                                            Xoá tất cả
                                        </button>
                                    </div>
                                </div>

                                <div style={styles.previewGrid}>
                                    {previewUrls.map((url, index) => (
                                        <div key={url} style={styles.thumb}>
                                            <img src={url} style={styles.thumbImg} />
                                            <div style={styles.index}>{index + 1}</div>

                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                style={styles.removeButton}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {job && (
                            <div style={styles.jobBox}>
                                <div style={styles.small}>Job ID</div>
                                <div style={styles.jobId}>{job.jobId}</div>

                                <div style={styles.progressHeader}>
                                    <span>{currentStep}</span>
                                    <b>{progress}%</b>
                                </div>

                                <div style={styles.progressBar}>
                                    <div
                                        style={{
                                            ...styles.progressFill,
                                            width: `${progress}%`,
                                        }}
                                    />
                                </div>

                                <div style={styles.small}>Status</div>
                                <div
                                    style={{
                                        ...styles.status,
                                        color:
                                            job.status === "DONE"
                                                ? "#22c55e"
                                                : job.status === "FAILED"
                                                    ? "#ef4444"
                                                    : "#f472b6",
                                    }}
                                >
                                    {job.status}
                                </div>

                                {job.error && <div style={styles.error}>{job.error}</div>}
                            </div>
                        )}
                    </div>

                    <div style={styles.main}>
                        <div style={styles.videoCard}>
                            <div style={styles.sectionHeader}>
                                <h2 style={styles.sectionTitle}>Video Preview</h2>

                                {videoSrc && (
                                    <a
                                        href={videoSrc}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={styles.link}
                                    >
                                        Mở video
                                    </a>
                                )}
                            </div>

                            {videoSrc ? (
                                <video controls autoPlay src={videoSrc} style={styles.video} />
                            ) : (
                                <div style={styles.emptyVideo}>Video sẽ hiển thị ở đây</div>
                            )}
                        </div>

                        <div style={styles.sideGrid}>
                            <div style={styles.panel}>
                                <h3 style={styles.panelTitle}>Script</h3>
                                <div style={styles.script}>{job?.script || "Chưa có script"}</div>
                            </div>

                            <div style={styles.panel}>
                                <h3 style={styles.panelTitle}>Logs</h3>
                                <div style={styles.logBox}>
                                    {logs.length === 0
                                        ? "Chưa có log"
                                        : logs.map((item, i) => <div key={i}>{item}</div>)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100vh",
        background:
            "radial-gradient(circle at top left, rgba(236,72,153,0.18), transparent 30%), #070711",
        color: "white",
        fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    },
    container: {
        maxWidth: 1280,
        margin: "0 auto",
        padding: "32px 24px",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        gap: 24,
        alignItems: "flex-end",
        marginBottom: 28,
    },
    badge: {
        display: "inline-block",
        padding: "6px 14px",
        borderRadius: 999,
        background: "rgba(236,72,153,0.12)",
        border: "1px solid rgba(236,72,153,0.35)",
        color: "#f9a8d4",
        fontSize: 14,
        marginBottom: 14,
    },
    title: {
        margin: 0,
        fontSize: 56,
        lineHeight: 1,
        fontWeight: 950,
        letterSpacing: -2,
    },
    subtitle: {
        marginTop: 14,
        color: "#94a3b8",
        fontSize: 18,
    },
    button: {
        border: 0,
        borderRadius: 18,
        padding: "16px 28px",
        background: "linear-gradient(90deg,#db2777,#f97316)",
        color: "white",
        fontWeight: 900,
        fontSize: 17,
        boxShadow: "0 20px 50px rgba(219,39,119,0.25)",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "420px 1fr",
        gap: 24,
        alignItems: "start",
    },
    card: {
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 28,
        padding: 22,
        boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
    },
    label: {
        display: "block",
        color: "#94a3b8",
        fontSize: 13,
        marginBottom: 8,
        marginTop: 14,
    },
    input: {
        width: "100%",
        height: 48,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "#020617",
        color: "white",
        padding: "0 14px",
        outline: "none",
        fontSize: 15,
        boxSizing: "border-box",
    },
    uploadBox: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: 130,
        borderRadius: 22,
        border: "2px dashed rgba(255,255,255,0.12)",
        background: "#020617",
        cursor: "pointer",
    },
    previewHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: "#94a3b8",
        fontSize: 13,
        marginBottom: 10,
        gap: 10,
    },
    previewActions: {
        display: "flex",
        alignItems: "center",
        gap: 8,
    },
    count: {
        background: "rgba(236,72,153,0.12)",
        color: "#f9a8d4",
        borderRadius: 999,
        padding: "2px 10px",
    },
    clearButton: {
        border: 0,
        borderRadius: 999,
        padding: "4px 10px",
        background: "rgba(239,68,68,0.15)",
        color: "#fecaca",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
    },
    previewGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 10,
    },
    thumb: {
        aspectRatio: "1/1",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "black",
        position: "relative",
    },
    thumbImg: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
    },
    index: {
        position: "absolute",
        top: 5,
        left: 5,
        background: "rgba(0,0,0,0.7)",
        borderRadius: 999,
        padding: "2px 7px",
        fontSize: 11,
    },
    removeButton: {
        position: "absolute",
        top: 5,
        right: 5,
        width: 24,
        height: 24,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.2)",
        background: "rgba(0,0,0,0.75)",
        color: "white",
        fontSize: 18,
        lineHeight: "20px",
        cursor: "pointer",
    },
    jobBox: {
        marginTop: 18,
        background: "#020617",
        borderRadius: 18,
        padding: 14,
        border: "1px solid rgba(255,255,255,0.08)",
    },
    small: {
        color: "#64748b",
        fontSize: 12,
        textAlign: "center",
    },
    jobId: {
        fontSize: 13,
        wordBreak: "break-all",
        marginBottom: 10,
        textAlign: "center",
    },
    progressHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: "#cbd5e1",
        fontSize: 13,
        marginTop: 14,
        marginBottom: 8,
        gap: 12,
    },
    progressBar: {
        width: "100%",
        height: 10,
        borderRadius: 999,
        background: "#1e293b",
        overflow: "hidden",
        marginBottom: 14,
    },
    progressFill: {
        height: "100%",
        borderRadius: 999,
        background: "linear-gradient(90deg,#22c55e,#06b6d4)",
        transition: "width 0.35s ease",
    },
    status: {
        fontWeight: 900,
        fontSize: 22,
        textAlign: "center",
    },
    error: {
        marginTop: 10,
        color: "#fecaca",
        background: "rgba(239,68,68,0.12)",
        border: "1px solid rgba(239,68,68,0.25)",
        padding: 10,
        borderRadius: 12,
        fontSize: 13,
    },
    main: {
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        gap: 24,
    },
    videoCard: {
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 28,
        padding: 22,
    },
    sectionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        margin: 0,
        fontSize: 24,
    },
    link: {
        color: "white",
        textDecoration: "none",
        background: "rgba(255,255,255,0.1)",
        padding: "8px 14px",
        borderRadius: 999,
        fontSize: 13,
    },
    video: {
        width: "100%",
        maxHeight: 760,
        borderRadius: 22,
        background: "black",
    },
    emptyVideo: {
        height: 640,
        borderRadius: 22,
        border: "1px dashed rgba(255,255,255,0.12)",
        background: "#020617",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748b",
    },
    sideGrid: {
        display: "grid",
        gap: 24,
    },
    panel: {
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 28,
        padding: 20,
    },
    panelTitle: {
        margin: "0 0 12px",
        fontSize: 18,
        textAlign: "center",
    },
    script: {
        background: "#020617",
        borderRadius: 16,
        padding: 14,
        color: "#cbd5e1",
        minHeight: 180,
        maxHeight: 260,
        overflow: "auto",
        whiteSpace: "pre-wrap",
        lineHeight: 1.6,
    },
    logBox: {
        background: "#000",
        borderRadius: 16,
        padding: 14,
        color: "#4ade80",
        height: 260,
        overflow: "auto",
        fontFamily: "monospace",
        fontSize: 12,
        lineHeight: 1.6,
    },
};

export default App;