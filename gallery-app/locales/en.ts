export const en = {
    main: {
        proMode: "PRO MODE",
        proSubtitle: "Precision · Verification · Advanced",
        kidsMode: "KIDS MODE",
        kidsSubtitle: "Easy & Fun Brick Creation",
        // gallery specific
        title: "Gallery",
        subtitle: "Explore amazing Brick creations made by AI.",
        sortLatest: "Latest",
        sortPopular: "Popular",
        noItems: "No works found",
        next: "NEXT",
        landing: {
            goMake: "Go Make",
            cardTitle: "Generated Brick 3D",
            titleLabel: "Title:",
            authorLabel: "Creator:",
            moreWorks: "Want to see more creations?",
            goToGallery: "Go to Gallery"
        }
    },
    floatingMenu: {
        mypage: "My Page",
        chatbot: "Chat with BrickBot",
        gallery: "Gallery",
        admin: "Admin Page",
        open: "Open Menu",
        iconAlt: "Menu Icon"
    },
    upgradeModal: {
        title: "UPGRADE",
        message: "Upgrade now to access more designs and advanced features.",
        kidsPlan: {
            title: "KIDS MODE",
            badge: "Easy",
            features: [
                "Direct photo/image upload",
                "Automatic design generation"
            ]
        },
        proPlan: {
            title: "PRO MODE",
            badge: "Pro",
            features: [
                "Preview TOP 3 recommended designs",
                "Up to 3 regenerations (rerolls)"
            ]
        },
        payBtn: "Pay with Google Pay",
        hint: "Based on TEST payment environment",
        alertSuccess: "Successfully upgraded to Pro membership!",
        alertFail: "Failed to upgrade membership."
    },
    menu: {
        profile: "Profile",
        membership: "Membership",
        jobs: "My Jobs",
        inquiries: "My Inquiries",
        gallery: "My Gallery",
        bookmarks: "Bookmarks",
        reports: "My Reports",
        settings: "Settings",
        delete: "Delete Account",
        admin: "Admin Only"
    },
    profile: {
        title: "My Profile",
        editTitle: "Edit Profile",
        nickname: "Nickname",
        email: "Email",
        bio: "Bio",
        joinedAt: "Joined",
        editBtn: "Edit Profile",
        cancelBtn: "Cancel",
        saveBtn: "Save",
        saving: "Saving...",
        alertSaved: "Profile updated.",
        alertFailed: "Failed to update profile.",
        imageAlt: "Profile",
        defaultNickname: "User"
    },
    membership: {
        title: "Membership Info",
        desc: "Current Plan: {plan}",
        upgradeBtn: "Upgrade to Pro",
        proUser: "You are on Pro Plan!"
    },
    jobs: {
        title: "My Jobs",
        empty: "No jobs yet.",
        status: {
            QUEUED: "Queued",
            RUNNING: "Running",
            CANCELED: "Canceled",
            DONE: "Done",
            FAILED: "Failed"
        },
        menu: {
            previewImage: "View Original Image",
            viewBlueprint: "View Assembly Guide",
            sourceImage: "Download Original Image",
            glbFile: "Download Model (glb)",
            ldrFile: "Download Blueprint (ldr)"
        },
        noGlbFile: "GLB file not available.",
        noLdrFile: "LDR file not available.",
        retryFail: "Failed to retry job.",
        modalError: "Job failed: ",
        modalPending: "Job is running or model not ready.",
        modalNoData: "Model data not found.",
        stillGenerating: "Still generating. Please wait.",
        retryConfirm: "Job failed or was canceled. Would you like to retry?",
        settingsTbd: "Settings coming soon"
    },
    settings: {
        title: "Settings",
        notification: "Notifications",
        language: "Language",
        changeBtn: "Change",
        langKo: "한국어",
        langEn: "English",
        langJa: "日本語"
    },
    delete: {
        title: "Delete Account",
        desc: "Are you sure? All data will be deleted irrecoverably.",
        btn: "Delete Account",
    },
    inquiries: {
        title: "My Inquiries",
        empty: "No inquiries yet.",
        status: {
            PENDING: "Pending",
            ANSWERED: "Answered",
        },
        adminAnswer: "Admin Answer",
    },
    reports: {
        title: "My Reports",
        empty: "No reports yet.",
        status: {
            PENDING: "Pending",
            RESOLVED: "Resolved",
            REJECTED: "Rejected",
        },
        reasons: {
            SPAM: "Spam/Ad",
            ABUSE: "Abuse/Insult",
            INAPPROPRIATE: "Inappropriate",
            GENERAL: "General",
        },
        targets: {
            POST: "Post",
            COMMENT: "Comment",
            USER: "User",
            JOB: "Job",
            GALLERY_POST: "Gallery",
            INQUIRY: "Inquiry",
            UPLOAD_FILE: "Upload File",
            PAYMENT_ORDER: "Payment",
            GENERAL: "General",
        },
        adminNote: "Admin Resolution",
        labelType: "Type",
        labelReason: "Reason",
        dataId: "Data ID",
    },
    kids: {
        title: "Select Your Level",
        level: "L{lv}",
        continueBtn: "Continue",
        model1: "Model 1",
        model2: "Model 2",
        generate: {
            loading: "AI is making your brick...",
            creating: "Creating...",
            complete: "Generation complete! Please check My Page.",
            ready: "It's complete!",
            next: "NEXT →",
            error: "Oops! Something went wrong.\nPlease try again later.",
            failed: "Job Failed",
            starting: "Starting job...",
            uploadPrepare: "Preparing S3 upload...",
            uploading: "Uploading image...",
            creating2: "Creating job...",
            jobCreated: "Job created",
            inProgress: "In progress...",
            loadingResult: "Loading result...",
            serverDelay: "Server response delayed...",
            aiNoResponse: "AI server not responding",
            errorOccurred: "Error occurred"
        },
        modelSelect: {
            title: "Creating Brick",
            sub: "Select model or upload image",
            autoGenSub: "Select a model to automatically generate.",
            pick: "Pick",
            picked: "Picked",
            uploadTitle: "Upload Image",
            uploadSub: "Click or drag files here",
            uploadHint: "JPG / PNG / WEBP",
            uploadProTitle: "Image Upload (PRO)",
            uploadProSub: "Click to upgrade",
            uploadProHint: "Available after upgrade",
            confirm: "Generate",
            previewTitle: "3D Preview",
            previewSub: "Rotate the model to check"
        },
        steps: {
            back: "Back",
            noUrl: "No URL available for steps.",
            title: "STEP {cur} / {total}",
            preview: "Brick Preview",
            loading: "Loading steps...",
            prev: "PREV",
            next: "NEXT",
            downloadGlb: "Download GLB",
            downloadLdr: "Download LDR",
            registerGallery: "Post to Gallery",
            galleryModal: {
                title: "Post to Gallery",
                placeholder: "Enter a title for your work",
                confirm: "Post",
                cancel: "Cancel",
                success: "Posted to gallery successfully!",
                fail: "Failed to post to gallery.",
                content: "Created in Kids Mode"
            },
            glbNotFound: "Server GLB not found.",
            glbDownloadFail: "Failed to download GLB file.",
            emptyGallery: "No works registered yet.",
            galleryTable: {
                title: "Title",
                author: "Author",
                date: "Modified Date",
                views: "Views"
            },
            viewModes: "View Modes",
            tabBrick: "Brick 3D",
            tabModeling: "3D Modeling",
            tabOriginal: "Original Image",
            originalModel: "Original 3D Model",
            previewTitle: "Brick Preview",
            startAssembly: "Start Assembly"
        }
    },
    header: {
        upgrade: "UPGRADE",
        login: "LOGIN",
        logout: "LOGOUT",
        gallery: "GALLERY",
        logoAlt: "BRICKERS Logo",
        myGallery: "My Gallery",
        myPage: "My Page"
    },
    auth: {
        title: "LOGIN",
        kakao: "Continue with Kakao",
        google: "Continue with Google",
        processing: "Signing in... Please wait.",
        loggingOut: "Logging out... Please wait.",
        failed: "Authentication failed.",
        redirecting: "Redirecting to home..."
    },
    adult: {
        title: "PRO MODE",
        ldrTest: "LDR Test",
        ldrDesc: "Currently a view to check LDraw part rendering.",
        fileLabel: "File",
        panel: {
            title: "Selection Info",
            hint: "Click a brick to see details."
        }
    },
    common: {
        loading: "Loading...",
        loginRequired: "Login Required",
        loginRequiredDesc: "Please login to use this feature.",
        homeBtn: "Go Home",
        retryBtn: "Retry",
        error: "Failed to load data.",
        unknownError: "Unknown error",
        noPreview: "No Preview",
        noImage: "No Image",
        anonymous: "Anonymous",
        confirm: "Confirm",
        cancel: "Cancel",
        later: "Maybe later"
    },
    admin: {
        panelTitle: "Admin Panel",
        welcome: "You have accessed the exclusive administrator tools.",
        stats: {
            users: "Total Users",
            jobs: "Today's Jobs",
            gallery: "New Gallery"
        },
        sidebar: {
            dashboard: "Dashboard",
            users: "User Management",
            gallery: "Gallery Management",
            settings: "System Settings",
            inquiries: "Inquiries",
            reports: "Reports",
            refunds: "Refunds"
        },
        accessDenied: "Access denied. (Role: {role})",
        inquiry: {
            adminAnswer: "Admin Answer",
            placeholder: "Enter your answer...",
            submit: "Submit Answer",
            success: "Answer submitted successfully.",
            empty: "No inquiries yet.",
            inputRequired: "Please enter an answer."
        },
        report: {
            resolve: "Approve Action",
            reject: "Reject",
            placeholder: "Enter action details or rejection reason...",
            resolved: "Action completed.",
            rejected: "Report rejected.",
            empty: "No reports yet.",
            inputRequired: "Please enter action details.",
            actionComplete: "Action Complete",
            actionRejected: "Report Rejected"
        },
        refund: {
            approve: "Approve",
            empty: "No refund requests.",
            amount: "Amount",
            inProgress: "Feature in progress"
        },
        error: "An error occurred.",
        failed: "Processing failed.",
        label: {
            target: "Target",
            reporter: "Reporter",
            order: "Order",
            user: "User"
        }
    },
    mypage: {
        stats: {
            jobs: "My Jobs",
            gallery: "My Gallery",
            joinedAt: "Joined"
        },
        bioPlaceholder: "Enter your bio!",
        nicknamePlaceholder: "Enter nickname",
        bioInputPlaceholder: "Enter your bio",
        noTitle: "No Title",
        payment: {
            date: "Payment Date",
            nextDate: "Next Payment"
        },
        preparing: "Content is coming soon..."
    },
    // gallery specific (from original gallery-app)
    detail: {
        back: "← Back to Gallery",
        description: "Description",
        noDescription: "No description available.",
        views: "Views",
        likes: "Likes",
        view3d: "View in 3D & Build"
    },
    my: {
        title: "My Gallery",
        subtitle: "Collect your creations and bookmarked works.",
        tabMy: "My Gallery",
        tabBookmarks: "Bookmarks",
        empty: "No works yet.",
        goToCreate: "Create New Work →",
        next: "NEXT",
        newWork: "Create New Work"
    },
    miniGame: {
        playAgain: "Play Again",
        gameOver: "Game Over!",
        score: "Score"
    }
};
