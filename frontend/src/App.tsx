import { useState } from "react";

function App() {

    const [productName, setProductName] = useState("");
    const [affiliateLink, setAffiliateLink] = useState("");

    const [status, setStatus] = useState("");
    const [videoUrl, setVideoUrl] = useState("");

    const [imageFile, setImageFile] =
        useState<File | null>(null);

    const [imagePreview, setImagePreview] =
        useState("");

    const handleImageChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {

        const file = e.target.files?.[0];

        if (!file) return;

        setImageFile(file);

        setImagePreview(
            URL.createObjectURL(file)
        );
    };

    const uploadImage = async () => {

        if (!imageFile) {
            return null;
        }

        const formData = new FormData();

        formData.append(
            "file",
            imageFile
        );

        const response = await fetch(
            "http://localhost:8080/api/videos/upload",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        return data.imagePath;
    };

    const createVideo = async () => {

        try {

            setVideoUrl("");
            setStatus("UPLOADING_IMAGE");

            let imagePath = null;

            if (imageFile) {
                imagePath = await uploadImage();
            }

            setStatus("CREATING_JOB");

            const response = await fetch(
                "http://localhost:8080/api/videos",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        productName,
                        affiliateLink,
                        imagePath
                    })
                }
            );

            const job = await response.json();

            setStatus("PROCESSING");

            const interval = setInterval(
                async () => {

                    const r = await fetch(
                        `http://localhost:8080/api/videos/${job.jobId}`
                    );

                    const current =
                        await r.json();

                    setStatus(
                        current.status
                    );

                    if (
                        current.videoUrl
                    ) {

                        setVideoUrl(
                            "http://localhost:8080" +
                            current.videoUrl
                        );
                    }

                    if (
                        current.status === "DONE" ||
                        current.status === "FAILED"
                    ) {

                        clearInterval(
                            interval
                        );
                    }

                },
                2000
            );

        } catch (e) {

            console.error(e);

            setStatus("FAILED");
        }
    };

    return (

        <div className="min-h-screen bg-slate-950 text-white">

            <div className="max-w-5xl mx-auto px-6 py-10">

                <h1 className="text-5xl font-bold mb-3">
                    🎬 TikTok AI Video Generator
                </h1>

                <p className="text-slate-400 mb-8">
                    Upload ảnh sản phẩm và tạo video affiliate tự động
                </p>

                <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl">

                    <div className="grid md:grid-cols-2 gap-6">

                        <div>

                            <label className="block mb-2 text-slate-300">
                                Tên sản phẩm
                            </label>

                            <input
                                className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700"
                                placeholder="Ví dụ: Máy xay mini"
                                value={productName}
                                onChange={(e) =>
                                    setProductName(
                                        e.target.value
                                    )
                                }
                            />

                            <label className="block mt-5 mb-2 text-slate-300">
                                Link Affiliate
                            </label>

                            <input
                                className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700"
                                placeholder="https://..."
                                value={affiliateLink}
                                onChange={(e) =>
                                    setAffiliateLink(
                                        e.target.value
                                    )
                                }
                            />

                            <label className="block mt-5 mb-2 text-slate-300">
                                Ảnh sản phẩm
                            </label>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={
                                    handleImageChange
                                }
                                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700"
                            />

                            <button
                                onClick={createVideo}
                                className="w-full mt-6 p-4 rounded-xl bg-pink-600 hover:bg-pink-500 font-bold transition"
                            >
                                🚀 Create Video
                            </button>

                        </div>

                        <div>

                            {imagePreview ? (

                                <img
                                    src={imagePreview}
                                    alt="preview"
                                    className="rounded-2xl w-full h-[400px] object-cover border border-slate-700"
                                />

                            ) : (

                                <div className="rounded-2xl border-2 border-dashed border-slate-700 h-[400px] flex items-center justify-center text-slate-500">
                                    Chưa chọn ảnh
                                </div>

                            )}

                        </div>

                    </div>

                </div>

                {status && (

                    <div className="mt-8 bg-slate-900 rounded-2xl p-5">

                        <h2 className="text-xl mb-3">
                            📊 Job Status
                        </h2>

                        <div className="text-pink-400 text-lg font-bold">
                            {status}
                        </div>

                    </div>

                )}

                {videoUrl && (

                    <div className="mt-10">

                        <h2 className="text-2xl font-bold mb-4">
                            🎥 Generated Video
                        </h2>

                        <video
                            controls
                            className="rounded-2xl shadow-2xl border border-slate-700"
                            width={420}
                            src={videoUrl}
                        />

                    </div>

                )}

            </div>

        </div>

    );
}

export default App;